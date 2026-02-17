async function callAI() {
    // 1. 先看本地有没有存过卡密
    let cardCode = localStorage.getItem('my_card_code');

    // 2. 如果没有存，就弹窗问用户要
    if (!cardCode) {
        cardCode = prompt("请输入您的授权卡密：");
        if (!cardCode) return; // 用户取消则退出
    }

    try {
        const response = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cardCode: cardCode,
                prompt: "这里是你的输入内容" // 比如从 input 框获取的值
            })
        });

        const result = await response.json();

        if (response.ok) {
            // 验证成功，把卡密存起来，下次不用输了
            localStorage.setItem('my_card_code', cardCode);
            alert("AI回复：" + result.choices[0].message.content);
        } else {
            // 验证失败，清除错误的卡密并提示
            localStorage.removeItem('my_card_code');
            alert("出错啦：" + result.error);
        }
    } catch (err) {
        alert("网络请求失败，请检查 Vercel 部署状态");
    }
}
