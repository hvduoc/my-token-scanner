const axios = require("axios");

const QUOTE_TOKEN_ADDRESS = "0x4200000000000000000000000000000000000006";
const API_URL = `https://api.dexscreener.com/latest/dex/tokens/${QUOTE_TOKEN_ADDRESS}/pairs`;

exports.handler = async function (event, context) {
  try {
    const response = await axios.get(API_URL);
    
    const sortedPairs = response.data.pairs.sort(
      (a, b) => b.pairCreatedAt - a.pairCreatedAt
    );
    
    const newTokens = [
      ...new Set(sortedPairs.slice(0, 50).map((p) => p.baseToken.address)),
    ];

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokens: newTokens }),
    };
  } catch (error) {
    console.error("Error fetching from Dexscreener:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch data from Dexscreener." }),
    };
  }
};