// netlify/functions/myBotLogic.js

exports.handler = async (event) => {
  try {
    const tokenInfo = JSON.parse(event.body);

    const {
      address,
      score = 0,
      volume = 0,
      txns = 0,
      is_honeypot = false
    } = tokenInfo;

    const decision = {
      address,
      action: "SKIP",
      reason: "Không đủ tiêu chí"
    };

    if (
      score >= 80 &&
      volume > 3000 &&
      txns > 30 &&
      !is_honeypot
    ) {
      decision.action = "BUY";
      decision.reason = "Token đạt tiêu chuẩn chiến lược Alpha-01";
    }

    return {
      statusCode: 200,
      body: JSON.stringify(decision)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
