import {
  HTTPCapability,
  EVMClient,
  getNetwork,
  hexToBase64,
  bytesToHex,
  TxStatus,
  handler,
  Runner,
  type Runtime,
  type HTTPPayload,
} from "@chainlink/cre-sdk";
import { encodeAbiParameters, parseAbiParameters, stringToHex, toHex } from "viem";

export type Config = {
  authorizedEVMAddress: string;
  registryAddress: string;
  chainSelectorName: string;
  gasLimit: string;
};

type WriteRequest = {
  key: string;
  value: string;
};

function decodeJson<T>(input: Uint8Array): T {
  const text = new TextDecoder().decode(input);
  return JSON.parse(text) as T;
}

export const onHttpTrigger = (runtime: Runtime<Config>, payload: HTTPPayload): string => {
  const request = decodeJson<WriteRequest>(payload.input);
  runtime.log(`Write request: key=${request.key}`);

  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: runtime.config.chainSelectorName,
  });

  if (!network) {
    throw new Error(`Network not found: ${runtime.config.chainSelectorName}`);
  }

  const evmClient = new EVMClient(network.chainSelector.selector);

  const keyBytes32 = stringToHex(request.key, { size: 32 });
  const valueBytes = toHex(new TextEncoder().encode(request.value));

  const reportData = encodeAbiParameters(
    parseAbiParameters("bytes32 key, bytes value"),
    [keyBytes32, valueBytes]
  );

  runtime.log("Generating signed report...");

  const reportResponse = runtime
    .report({
      encodedPayload: hexToBase64(reportData),
      encoderName: "evm",
      signingAlgo: "ecdsa",
      hashingAlgo: "keccak256",
    })
    .result();

  runtime.log("Submitting to blockchain...");

  const writeResult = evmClient
    .writeReport(runtime, {
      receiver: runtime.config.registryAddress,
      report: reportResponse,
      gasConfig: {
        gasLimit: runtime.config.gasLimit,
      },
    })
    .result();

  if (writeResult.txStatus === TxStatus.SUCCESS) {
    const txHash = bytesToHex(writeResult.txHash || new Uint8Array(32));
    runtime.log(`Transaction successful: ${txHash}`);
    return JSON.stringify({ status: "confirmed", txHash });
  }

  const errorMessage = writeResult.errorMessage || `Failed with status: ${writeResult.txStatus}`;
  runtime.log(`Transaction failed: ${errorMessage}`);
  return JSON.stringify({ status: "failed", errorMessage });
};

export const initWorkflow = (config: Config) => {
  const httpCap = new HTTPCapability();

  return [
    handler(
      httpCap.trigger({
        authorizedKeys: [
          {
            type: "KEY_TYPE_ECDSA_EVM",
            publicKey: config.authorizedEVMAddress,
          },
        ],
      }),
      onHttpTrigger
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
