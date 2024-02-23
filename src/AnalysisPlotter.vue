<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useMovementStore } from './stores/movement';
const canvas = ref<HTMLCanvasElement | null>(null);
const movement = useMovementStore();
const proportion = [5, 1];

const frameFunction = () => {
  if (canvas.value) {
    canvas.value.getContext('2d')?.clearRect(0, 0, canvas.value.width, canvas.value.height);
    movement.plot(canvas.value);
  }
  requestAnimationFrame(frameFunction);
}
const windowResizeFunction = () => {
  const width = window.innerWidth;
  const height = window.innerHeight * proportion[1] / proportion[0];
  if (canvas.value) {
    canvas.value.width = width;
    canvas.value.height = height;
    canvas.value.style.width = `${width}px`;
    canvas.value.style.height = `${height}px`;
  }
}

onMounted(() => {
  windowResizeFunction();
  window.addEventListener('resize', windowResizeFunction);
  frameFunction();
});
onUnmounted(() => {
  window.removeEventListener('resize', windowResizeFunction);
});


</script>
<template>
    <canvas ref="canvas" />
</template>
<style scoped>
canvas {
  position: fixed;
  bottom: 0;
  left: 0;
  border: solid 1px;
}
</style>