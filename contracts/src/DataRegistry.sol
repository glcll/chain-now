// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title IReceiver - receives keystone reports
interface IReceiver is IERC165 {
    function onReport(bytes calldata metadata, bytes calldata report) external;
}

/// @title DataRegistry - Universal key/value store for CRE agent writes
/// @notice Any web agent can write arbitrary data onchain through a CRE workflow.
///         Data is stored as bytes32 keys mapping to bytes values, with full
///         provenance metadata (timestamp, workflow ID) for auditability.
contract DataRegistry is IReceiver, Ownable {
    struct Entry {
        bytes value;
        uint256 timestamp;
        bytes32 workflowId;
        bool exists;
    }

    address private s_forwarderAddress;
    mapping(bytes32 => Entry) private s_entries;
    bytes32[] private s_keys;

    bytes private constant HEX_CHARS = "0123456789abcdef";

    error InvalidForwarderAddress();
    error InvalidSender(address sender, address expected);

    event ForwarderAddressUpdated(address indexed previousForwarder, address indexed newForwarder);
    event DataWritten(bytes32 indexed key, bytes value, uint256 timestamp, bytes32 workflowId);

    constructor(address _forwarderAddress) Ownable(msg.sender) {
        if (_forwarderAddress == address(0)) {
            revert InvalidForwarderAddress();
        }
        s_forwarderAddress = _forwarderAddress;
        emit ForwarderAddressUpdated(address(0), _forwarderAddress);
    }

    /// @inheritdoc IReceiver
    function onReport(bytes calldata metadata, bytes calldata report) external override {
        if (s_forwarderAddress != address(0) && msg.sender != s_forwarderAddress) {
            revert InvalidSender(msg.sender, s_forwarderAddress);
        }

        bytes32 workflowId;
        assembly {
            workflowId := calldataload(metadata.offset)
        }

        _processReport(report, workflowId);
    }

    function _processReport(bytes calldata report, bytes32 workflowId) internal {
        (bytes32 key, bytes memory value) = abi.decode(report, (bytes32, bytes));

        if (!s_entries[key].exists) {
            s_keys.push(key);
        }

        s_entries[key] = Entry({
            value: value,
            timestamp: block.timestamp,
            workflowId: workflowId,
            exists: true
        });

        emit DataWritten(key, value, block.timestamp, workflowId);
    }

    /// @notice Read the raw value for a key
    function read(bytes32 key) external view returns (bytes memory) {
        return s_entries[key].value;
    }

    /// @notice Read the full entry with metadata
    function getEntry(bytes32 key) external view returns (
        bytes memory value,
        uint256 timestamp,
        bytes32 workflowId,
        bool exists
    ) {
        Entry storage entry = s_entries[key];
        return (entry.value, entry.timestamp, entry.workflowId, entry.exists);
    }

    /// @notice Get total number of unique keys stored
    function getKeyCount() external view returns (uint256) {
        return s_keys.length;
    }

    /// @notice Get a key by index (for enumeration)
    function getKeyAtIndex(uint256 index) external view returns (bytes32) {
        return s_keys[index];
    }

    function getForwarderAddress() external view returns (address) {
        return s_forwarderAddress;
    }

    function setForwarderAddress(address _forwarder) external onlyOwner {
        address prev = s_forwarderAddress;
        s_forwarderAddress = _forwarder;
        emit ForwarderAddressUpdated(prev, _forwarder);
    }

    /// @inheritdoc IERC165
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IReceiver).interfaceId || interfaceId == type(IERC165).interfaceId;
    }
}
