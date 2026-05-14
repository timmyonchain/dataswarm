// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title  DataSwarm
 * @notice AI training data marketplace on 0G blockchain.
 *         Contributors list datasets, the DataSwarm platform submits AI
 *         validation scores on-chain, and buyers purchase permanent access.
 *         Revenue is split 90 % contributor / 10 % platform on every sale.
 */
contract DataSwarm is ReentrancyGuard, Ownable {

    // ── Structs ────────────────────────────────────────────────────────────

    struct Dataset {
        uint256 id;
        string  storageHash;          // 0G Storage content hash
        string  metadataURI;          // Off-chain metadata (name, description, tags)
        address contributor;
        uint256 price;                // Access price in wei
        uint8   validationScore;      // 0–100; written by AI agent via owner
        string  validationReportHash; // 0G/IPFS hash of the validation report
        bool    isValidated;
        uint256 totalPurchases;
        uint256 earnings;             // Pending withdrawable balance for contributor
        uint256 createdAt;
    }

    // ── Constants ──────────────────────────────────────────────────────────

    /// @dev 10 % platform fee expressed in basis points (1 bps = 0.01 %).
    uint256 public constant PLATFORM_FEE_BPS = 1_000;
    uint256 public constant BPS_DENOMINATOR  = 10_000;

    // ── State ──────────────────────────────────────────────────────────────

    /// @dev Dataset storage; IDs start at 1 so 0 is a sentinel for "not found".
    mapping(uint256 => Dataset) private _datasets;

    /// @dev Tracks which addresses have purchased each dataset.
    mapping(uint256 => mapping(address => bool)) private _hasAccess;

    /// @dev Auto-incrementing ID; next dataset will receive this value.
    uint256 private _nextId = 1;

    // ── Events ─────────────────────────────────────────────────────────────

    event DatasetListed(
        uint256 indexed datasetId,
        address indexed contributor,
        string  storageHash,
        uint256 price
    );

    event DatasetValidated(
        uint256 indexed datasetId,
        uint8   score,
        string  reportHash
    );

    event DatasetPurchased(
        uint256 indexed datasetId,
        address indexed buyer,
        uint256 price
    );

    event EarningsWithdrawn(
        uint256 indexed datasetId,
        address indexed contributor,
        uint256 amount
    );

    // ── Constructor ────────────────────────────────────────────────────────

    constructor() Ownable(msg.sender) {}

    // ── Write functions ────────────────────────────────────────────────────

    /**
     * @notice List a new dataset on the marketplace.
     * @param  storageHash  0G Storage hash pointing to the dataset file.
     * @param  price        Access price in wei. Must be greater than zero.
     * @param  metadataURI  URI for off-chain metadata JSON (name, description, etc.).
     * @return datasetId    The ID assigned to the new listing.
     */
    function listDataset(
        string calldata storageHash,
        uint256 price,
        string calldata metadataURI
    ) external returns (uint256 datasetId) {
        require(price > 0,                      "DataSwarm: price must be > 0");
        require(bytes(storageHash).length > 0,  "DataSwarm: storageHash required");

        datasetId = _nextId++;

        _datasets[datasetId] = Dataset({
            id:                   datasetId,
            storageHash:          storageHash,
            metadataURI:          metadataURI,
            contributor:          msg.sender,
            price:                price,
            validationScore:      0,
            validationReportHash: "",
            isValidated:          false,
            totalPurchases:       0,
            earnings:             0,
            createdAt:            block.timestamp
        });

        emit DatasetListed(datasetId, msg.sender, storageHash, price);
    }

    /**
     * @notice Submit an AI validation result for a dataset.
     * @dev    Restricted to the contract owner (the DataSwarm platform key).
     *         Called after off-chain agent swarms have analysed the dataset.
     * @param  datasetId  ID of the dataset being validated.
     * @param  score      Aggregate quality score from 0 to 100.
     * @param  reportHash 0G/IPFS hash of the full agent validation report.
     */
    function submitValidation(
        uint256 datasetId,
        uint8   score,
        string calldata reportHash
    ) external onlyOwner {
        Dataset storage ds = _datasets[datasetId];
        require(ds.id != 0,   "DataSwarm: dataset does not exist");
        require(score <= 100, "DataSwarm: score must be <= 100");

        ds.validationScore      = score;
        ds.validationReportHash = reportHash;
        ds.isValidated          = true;

        emit DatasetValidated(datasetId, score, reportHash);
    }

    /**
     * @notice Purchase permanent access to a validated dataset.
     * @dev    Sends 10 % to the platform owner immediately; credits the
     *         remaining 90 % to the contributor's withdrawable earnings.
     *         Uses a pull-payment pattern for contributor funds to avoid
     *         blocking purchases if a contributor address reverts on receipt.
     * @param  datasetId  ID of the dataset to purchase.
     */
    function purchaseDataset(uint256 datasetId) external payable nonReentrant {
        Dataset storage ds = _datasets[datasetId];
        require(ds.id != 0,                            "DataSwarm: dataset does not exist");
        require(ds.isValidated,                        "DataSwarm: dataset not yet validated");
        require(msg.value == ds.price,                 "DataSwarm: incorrect payment amount");
        require(!_hasAccess[datasetId][msg.sender],    "DataSwarm: already purchased");
        require(msg.sender != ds.contributor,          "DataSwarm: contributor cannot purchase own dataset");

        _hasAccess[datasetId][msg.sender] = true;
        ds.totalPurchases += 1;

        uint256 platformFee      = (msg.value * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 contributorShare = msg.value - platformFee;

        // Accumulate contributor share for pull-withdrawal
        ds.earnings += contributorShare;

        // Push platform fee immediately — owner is a trusted EOA/multisig
        (bool sent,) = owner().call{value: platformFee}("");
        require(sent, "DataSwarm: platform fee transfer failed");

        emit DatasetPurchased(datasetId, msg.sender, msg.value);
    }

    /**
     * @notice Withdraw all accumulated earnings for a dataset you contributed.
     * @dev    Resets the pending balance before transferring to prevent
     *         reentrancy (checks-effects-interactions pattern).
     * @param  datasetId  ID of the dataset to withdraw earnings from.
     */
    function withdrawEarnings(uint256 datasetId) external nonReentrant {
        Dataset storage ds = _datasets[datasetId];
        require(ds.id != 0,                  "DataSwarm: dataset does not exist");
        require(ds.contributor == msg.sender, "DataSwarm: not the contributor");

        uint256 amount = ds.earnings;
        require(amount > 0, "DataSwarm: no earnings to withdraw");

        // Zero out before transfer — reentrancy guard + CEI pattern
        ds.earnings = 0;

        (bool sent,) = msg.sender.call{value: amount}("");
        require(sent, "DataSwarm: withdrawal transfer failed");

        emit EarningsWithdrawn(datasetId, msg.sender, amount);
    }

    // ── View functions ─────────────────────────────────────────────────────

    /**
     * @notice Check whether an address has purchased access to a dataset.
     * @param  datasetId  ID of the dataset.
     * @param  buyer      Address to check.
     * @return            True if the buyer has purchased access.
     */
    function hasAccess(uint256 datasetId, address buyer) external view returns (bool) {
        return _hasAccess[datasetId][buyer];
    }

    /**
     * @notice Fetch the full on-chain record for a single dataset.
     * @param  datasetId  ID of the dataset.
     * @return            The Dataset struct.
     */
    function getDataset(uint256 datasetId) external view returns (Dataset memory) {
        require(_datasets[datasetId].id != 0, "DataSwarm: dataset does not exist");
        return _datasets[datasetId];
    }

    /**
     * @notice Fetch every dataset listed on the marketplace.
     * @dev    O(n) view — never call this inside a write transaction.
     *         For large catalogues, prefer paginated off-chain indexing.
     * @return Array of all Dataset structs in listing order.
     */
    function getAllDatasets() external view returns (Dataset[] memory) {
        uint256 total = _nextId - 1;
        Dataset[] memory all = new Dataset[](total);
        for (uint256 i = 0; i < total; ) {
            all[i] = _datasets[i + 1];
            unchecked { ++i; }
        }
        return all;
    }

    /**
     * @notice Returns the total number of datasets listed to date.
     * @return count  Current dataset count.
     */
    function getTotalDatasets() external view returns (uint256 count) {
        return _nextId - 1;
    }
}
