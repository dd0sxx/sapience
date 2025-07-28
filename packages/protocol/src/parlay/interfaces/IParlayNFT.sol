// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title IParlayNFT
 * @notice Interface for Parlay NFT contract
 */
interface IParlayNFT is IERC721 {
    /**
     * @notice Mint a new parlay NFT
     * @param to Address to mint the NFT to
     * @param tokenId Token ID for the NFT
     * @param parlayData Encoded parlay data
     */
    function mint(address to, uint256 tokenId, bytes calldata parlayData) external;

    /**
     * @notice Burn a parlay NFT (called on settlement or expiration)
     * @param tokenId Token ID to burn
     */
    function burn(uint256 tokenId) external;

    /**
     * @notice Get parlay data stored in NFT
     * @param tokenId Token ID
     * @return parlayData Encoded parlay data
     */
    function getParlayData(uint256 tokenId) external view returns (bytes memory parlayData);

    /**
     * @notice Check if a parlay NFT exists and is valid
     * @param tokenId Token ID to check
     * @return exists Whether the NFT exists
     * @return isSettled Whether the parlay has been settled
     */
    function parlayStatus(uint256 tokenId) external view returns (bool exists, bool isSettled);
} 