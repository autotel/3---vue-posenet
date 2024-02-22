import { defineStore } from 'pinia';

export const usePoseStore = defineStore('store', () => {
    let points: { [key: string]: [number, number] } = {};
    let lastTime = new Date().getTime();
    const lastDeltaTimes: number[] = [];

    const timestamp = (time: number) => {
        // console.log(time - lastTime);
        lastDeltaTimes.push(time - lastTime);
        lastTime = time;
        if (lastDeltaTimes.length > 10) {
            lastDeltaTimes.shift();
        }
    }

    const getFrameRate = () => {
        if(lastDeltaTimes.length === 0) {
            return '...';
        }
        return (1000 / (lastDeltaTimes.reduce((a, b) => a + b, 0) / lastDeltaTimes.length)).toFixed(2);
    }

    const keypoint = (name: string, x: number, y: number) => {
        points[name] = [x, y];
    }

    const tryPoint = (from: string, to: string): [number, number, number, number] | false => {
        if (points[from] && points[to]) {
            return [points[from][0], points[from][1], points[to][0], points[to][1]];
        }
        return false;
    }

    const reset = () => {
        points = {};
    }

    const getLines = () => {
        const lines: [number, number, number, number][] = [];
        for (const [from, to] of [
            ['left_ear', 'right_ear'],
            ['left_eye', 'right_eye'],
            ['left_shoulder', 'right_shoulder'],
            ['right_shoulder', 'right_hip'],
            ['left_shoulder', 'left_hip'],
            ['left_elbow', 'left_shoulder'],
            ['left_elbow', 'left_wrist'],
            ['right_elbow', 'right_shoulder'],
            ['right_elbow', 'right_wrist'],
            ['left_hip', 'right_hip'],
            ['left_hip', 'left_knee'],
            ['left_knee', 'left_ankle'],
            ['right_hip', 'right_knee'],
            ['right_knee', 'right_ankle'],
        ]) {
            const tp = tryPoint(from, to);
            if (tp) {
                lines.push(tp);
            }
        }
        return lines;
    }

    return { 
        keypoint, 
        getLines, 
        reset, 
        timestamp ,
        getFrameRate,
    };

})
