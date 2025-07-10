const axios = require("axios");

const CHAIN_ID = "8453"; // Base

exports.handler = async function (event, context) {
  const tokenAddress = event.queryStringParameters.address;

  if (!tokenAddress) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing token address." }),
    };
  }
  
  const API_URL = `https://api.gopluslabs.io/api/v1/token_security/${CHAIN_ID}?contract_addresses=${tokenAddress}`;

  try {
    const response = await axios.get(API_URL);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    console.error("Error fetching from GoPlus:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch data from GoPlus." }),
    };
  }
};