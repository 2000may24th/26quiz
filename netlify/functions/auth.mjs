import { getStore } from "@netlify/blobs";

export default async (req) => {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    const store = getStore("users");
    const { action, id, pin } = await req.json();

    if (!/^\d{4}$/.test(pin)) {
        return new Response(JSON.stringify({ error: "비밀번호는 4자리 숫자여야 합니다." }), { status: 400 });
    }

    try {
        const existingUserStr = await store.get(id);

        if (action === "register") {
            if (existingUserStr) return new Response(JSON.stringify({ error: "이미 존재하는 아이디입니다." }), { status: 409 });
            
            // 객체를 문자열로 바꿔서 저장
            await store.set(id, JSON.stringify({ pin, createdAt: Date.now() }));
            return new Response(JSON.stringify({ success: true, message: "가입 성공!" }), { status: 200 });
        } 
        
        if (action === "login") {
            if (!existingUserStr) return new Response(JSON.stringify({ error: "존재하지 않는 아이디입니다." }), { status: 404 });
            
            // 가져온 문자열을 파싱
            const userData = JSON.parse(existingUserStr);
            if (userData.pin !== pin) return new Response(JSON.stringify({ error: "비밀번호가 틀렸습니다." }), { status: 401 });
            return new Response(JSON.stringify({ success: true, id }), { status: 200 });
        }
    } catch (err) {
        return new Response(JSON.stringify({ error: "서버 오류가 발생했습니다." }), { status: 500 });
    }
};
