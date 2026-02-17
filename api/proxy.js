import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    // 准许跨域和 POST 请求
    if (req.method !== 'POST') return res.status(405).json({ error: '不允许的请求方式' });

    const { cardCode, prompt } = req.body;
    const masterCode = process.env.USER_CARD_CODE; // 你在环境变量设的永久码

    let isAuthorized = false;

    // 1. 优先验证是否是环境变量里的永久码
    if (masterCode && cardCode === masterCode) {
        isAuthorized = true;
    } else {
        // 2. 如果不是永久码，去数据库查这个动态卡密
        try {
            const cardData = await kv.get(cardCode);
            if (cardData) {
                // 检查是否过期 (数据格式: { "expire": 1739894400000 })
                if (Date.now() < cardData.expire) {
                    isAuthorized = true;
                } else {
                    await kv.del(cardCode); // 自动删除过期码
                    return res.status(403).json({ error: "该卡密已过期失效" });
                }
            }
        } catch (dbError) {
            console.error("数据库读取失败", dbError);
        }
    }

    if (!isAuthorized) {
        return res.status(403).json({ error: "授权码无效或已过期" });
    }

    // 3. 授权通过，如果是“验证激活”请求，直接返回成功
    if (prompt === "验证激活") {
        return res.status(200).json({ message: "验证通过" });
    }

    // 4. 执行 AI 请求逻辑
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.AI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }]
            })
        });
        const data = await response.json();
        res.status(200).json(data);
    } catch (e) {
        res.status(500).json({ error: "AI 服务暂时不可用" });
    }
}
