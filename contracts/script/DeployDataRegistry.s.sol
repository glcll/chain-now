// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../src/DataRegistry.sol";

contract DeployDataRegistry is Script {
    function run() external {
        address forwarder = vm.envAddress("FORWARDER_ADDRESS");

        vm.startBroadcast();
        DataRegistry registry = new DataRegistry(forwarder);
        vm.stopBroadcast();

        console.log("DataRegistry deployed at:", address(registry));
        console.log("Forwarder address:       ", forwarder);
        console.log("Owner:                   ", registry.owner());
    }
}
