const axios = require("axios");

const CHAIN_NAME = "base";

exports.handler = async function (event, context) {
    const tokenAddress = event.queryStringParameters.address;
    if (!tokenAddress) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Missing token address." }),
        };
    }

    try {
        // 1. Search for the pair address
        const searchUrl = `https://api.dexscreener.com/latest/dex/search?q=${tokenAddress}`;
        const searchResponse = await axios.get(searchUrl);
        const pair = searchResponse.data.pairs.find(p => p.chainId === CHAIN_NAME && p.baseToken.address.toLowerCase() === tokenAddress.toLowerCase());

        if (!pair || !pair.pairAddress) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: "Pair not found." }),
            };
        }

        // 2. Get transactions for that pair
        const tradersUrl = `https://api.dexscreener.com/latest/dex/pairs/${CHAIN_NAME}/${pair.pairAddress}`;
        const tradersResponse = await axios.get(tradersUrl);

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(tradersResponse.data),
        };

    } catch (error) {
        console.error("Error fetching top trader:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to fetch top trader data." }),
        };
    }
};