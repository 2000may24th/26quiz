import { getStore } from "@netlify/blobs";

export default async (req) => {
    const store = getStore("records");

    // 기록 저장 (POST)
    if (req.method === "POST") {
        const record = await req.json();
        const records = await store.getJSON("all_records") || [];
        record.timestamp = Date.now();
        records.push(record);
        await store.setJSON("all_records", records);
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    // 기록 조회 (GET)
    if (req.method === "GET") {
        const url = new URL(req.url);
        const userId = url.searchParams.get("userId");
        const mode = url.searchParams.get("mode"); // 예: num2alpha_time_30
        const allRecords = await store.getJSON("all_records") || [];

        // 특정 유저의 기록 조회
        if (userId) {
            const userRecords = allRecords
                .filter(r => r.userId === userId)
                .sort((a, b) => b.timestamp - a.timestamp);
            return new Response(JSON.stringify(userRecords), { status: 200 });
        }

        // 전체 리더보드 (모드별 1인당 최고 기록 1개)
        if (mode) {
            const modeRecords = allRecords.filter(r => r.modeKey === mode);
            const bestPerUser = {};

            modeRecords.forEach(r => {
                const isTimeMode = r.modeType === 'time';
                if (!bestPerUser[r.userId]) {
                    bestPerUser[r.userId] = r;
                } else {
                    const currentBest = bestPerUser[r.userId];
                    // 시간 모드는 점수가 높을수록, 개수 모드는 시간이 적을수록 우수
                    if (isTimeMode) {
                        if (r.score > currentBest.score) bestPerUser[r.userId] = r;
                    } else {
                        if (r.time < currentBest.time) bestPerUser[r.userId] = r;
                    }
                }
            });

            // 정렬 후 배열 반환
            const leaderboard = Object.values(bestPerUser).sort((a, b) => {
                return a.modeType === 'time' ? b.score - a.score : a.time - b.time;
            });

            return new Response(JSON.stringify(leaderboard), { status: 200 });
        }

        return new Response(JSON.stringify([]), { status: 200 });
    }
};