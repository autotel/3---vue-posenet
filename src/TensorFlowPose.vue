<script setup lang="ts">
import '@tensorflow/tfjs-backend-webgl';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { ref, watch, watchEffect } from 'vue';
import { usePoseStore } from './stores/pose';
import { useVideoSourceStore } from './stores/videoSource';

const ratioToHex16 = (f: number) => {
    if (f < 0) return '00';
    if (f > 1) return 'ff';
    const hex = Math.floor(f * 255).toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
}
const poseStore = usePoseStore();
const videoSourceStore = useVideoSourceStore();
const detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    {
        runtime: 'tfjs',
        enableSmoothing: true,

    });
let videoElement = ref<HTMLVideoElement | false>(false);
let poseDetectionIsRunning = ref(false);
let canvasElement = ref<HTMLCanvasElement | false>(false);
let context: CanvasRenderingContext2D | null = null;
let drawnPoints = ref(0);

let requestedAnimationFrame: number | null = null;
let requestedVideoFrame: number | null = null;

const resizeCanvas = () => {
    if (!canvasElement.value) return;
    const video = videoElement.value;
    if (!video) return;
    canvasElement.value.width = video.videoWidth;
    canvasElement.value.height = video.videoHeight;
}


watchEffect(async () => {
    if (!videoSourceStore.stream) return;
    if (!videoElement.value) return;
    videoElement.value.srcObject = videoSourceStore.stream;
    await videoElement.value.load();
    await videoElement.value.play();
    poseDetectionIsRunning.value = true;
});

watch(poseDetectionIsRunning, async (isRunning) => {
    if (isRunning) {
        detectorFrame();
        drawFrame();
    } else {
        cancelAnimationFrame(requestedAnimationFrame!);
        requestedAnimationFrame = null;
        if (videoElement.value) {
            videoElement.value?.cancelVideoFrameCallback(requestedVideoFrame!);
        }
    }
});

let videoFrameCallbackSupported = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
if(!videoFrameCallbackSupported){
    console.log('requestVideoFrameCallback not supported, using requestAnimationFrame instead.');
}
const detectorFrame = async () => {
    if (!videoElement.value) return;
    if (!videoSourceStore.stream) return;
    const video = videoElement.value;
    if (!video) return;
    const estimationConfig = {
        flipHorizontal: false,
        maxPoses: 1,
        scoreThreshold: 0.9,

    }

    if (video.readyState < 2) {
        await new Promise((resolve) => {
            console.log('waiting for video to load');
            video.onloadeddata = () => {
                resolve(video);
            };
        });
    }
    
    poseStore.timestamp(new Date().getTime());
    const poses = await detector.estimatePoses(video, estimationConfig);

    poseStore.reset();

    for (const pose of poses) {
        drawnPoints.value = pose.keypoints.length;
        const keypoints = pose.keypoints;
        for (const keypoint of keypoints) {
            if (!keypoint.score) continue;
            // context.fillStyle = `#FF0000${ratioToHex16(keypoint.score)}`;
            if (!isNaN(keypoint.x) && !isNaN(keypoint.y) && keypoint.name) {
                // skip kp outside screen
                if (keypoint.x < 0 || keypoint.x > video.videoWidth) continue;
                if (keypoint.y < 0 || keypoint.y > video.videoHeight) continue;
                if (keypoint.score < 0.3) continue;

                // context.fillText(`${keypoint.name}`, keypoint.x + 10, keypoint.y + 5);
                // context.beginPath();
                // context.arc(keypoint.x, keypoint.y, 5, 0, Math.PI * 2);
                // context.fill();
                poseStore.keypoint(keypoint.name, keypoint.x, keypoint.y);
            }

        }
    }
    if (poseDetectionIsRunning.value) {
        if (videoFrameCallbackSupported) {
            requestedVideoFrame = video.requestVideoFrameCallback(detectorFrame);
        } /* else {
            will happen on frame function
        } */
    }else{
        console.log('stopped running');
    }

}
const drawFrame = async () => {
    if (!videoSourceStore.stream) return;
    if (!canvasElement.value) return;

    if (!context) {
        context = canvasElement.value.getContext('2d');
    }
    if (!context) return;

    if(!videoFrameCallbackSupported){
        detectorFrame();
    }

    context.strokeStyle = '#00FF00';
    context.lineWidth = 2;
    context.clearRect(0, 0, canvasElement.value.width, canvasElement.value.height);
    const segments = poseStore.getLines();
    for (const segment of segments) {
        context.beginPath();
        context.moveTo(segment[0], segment[1]);
        context.lineTo(segment[2], segment[3]);
        context.stroke();
    }
    if (poseDetectionIsRunning.value) {
        requestedAnimationFrame = requestAnimationFrame(drawFrame);
    }
}

watchEffect(() => {
    if (videoElement.value) {
        videoElement.value.addEventListener('loadedmetadata', resizeCanvas);
    }
});

watchEffect(() => {
    if (canvasElement.value) {
        resizeCanvas();
    }
});

</script>
<template>
    <div>
        <template v-if="videoSourceStore.stream">
            <div class="viewport">
                <video ref="videoElement" autoplay></video>
                <canvas ref="canvasElement"></canvas>
                <!-- {{ poseDetectionIsRunning }}, {{ drawnPoints }} -->
            </div>
        </template>
    </div>
</template>

<style scoped>
.viewport {
    position: fixed;
    width: 100vw;
    height: 100vh;
    top: 0;
    left: 0;
}

.viewport * {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
}
.viewport video {
    opacity: 0.5;
}
</style>
