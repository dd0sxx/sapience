pragma solidity ^0.8.0;

interface IOracle {
    function getMarketOdds(uint256[] calldata marketIds) external view returns (uint256[] memory odds);
    function getCorrelationMatrix(uint256[] calldata marketIds) external view returns (uint256[][] memory correlations);
}

