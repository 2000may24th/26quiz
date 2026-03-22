import { getStore } from "@netlify/blobs";

export default async (req) => {
    try {
        const store = getStore("records");

        // [POST] 기록 저장
        if (req.method === "POST") {
            const record = await req.json();
            
            let records = [];
            try { 
                const dataStr = await store.get("all_records");
                if (dataStr) records = JSON.parse(dataStr); 
            } catch(e) {}
            
            record.timestamp = Date.now();
            records.push(record);
            
            await store.set("all_records", JSON.stringify(records));
            
            return new Response(JSON.stringify({ success: true }), { 
                status: 200, headers: { "Content-Type": "application/json" } 
            });
        }

        // [GET] 기록 조회
        if (req.method === "GET") {
            const url = new URL(req.url);
            const userId = url.searchParams.get("userId");
            const mode = url.searchParams.get("mode");

            let allRecords = [];
            try { 
                const dataStr = await store.get("all_records");
                if (dataStr) allRecords = JSON.parse(dataStr); 
            } catch(e) {}

            // 1. 특정 유저의 기록 조회
            if (userId) {
                const userRecords = allRecords
                    .filter(r => r.userId === userId)
                    .sort((a, b) => b.timestamp - a.timestamp);
                return new Response(JSON.stringify(userRecords), { 
                    status: 200, headers: { "Content-Type": "application/json" } 
                });
            }

            // 2. 특정 모드의 리더보드 (1인당 최고 기록 1개씩 필터링)
            if (mode) {
                const modeRecords = allRecords.filter(r => r.modeKey === mode);
                const bestPerUser = {};

                modeRecords.forEach(r => {
                    const isTimeMode = r.modeType === 'time';
                    if (!bestPerUser[r.userId]) {
                        bestPerUser[r.userId] = r;
                    } else {
                        const currentBest = bestPerUser[r.userId];
                        if (isTimeMode) {
                            if (r.score > currentBest.score) bestPerUser[r.userId] = r;
                        } else {
                            if (r.time < currentBest.time) bestPerUser[r.userId] = r;
                        }
                    }
                });

                const leaderboard = Object.values(bestPerUser).sort((a, b) => {
                    return a.modeType === 'time' ? b.score - a.score : a.time - b.time;
                });

                return new Response(JSON.stringify(leaderboard), { 
                    status: 200, headers: { "Content-Type": "application/json" } 
                });
            }

            // 3. 🌟 수정된 부분: 특정 조건이 없을 경우 빈 배열이 아닌 전체 기록 반환
            return new Response(JSON.stringify(allRecords), { 
                status: 200, headers: { "Content-Type": "application/json" } 
            });
        }
    } catch (error) {
        console.error("서버 에러:", error);
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, headers: { "Content-Type": "application/json" } 
        });
    }
};
