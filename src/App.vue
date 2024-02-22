<script setup lang="ts">
import TensorFlowPose from './TensorFlowPose.vue';
</script>
<template>
  <Suspense>
    <TensorFlowPose />
    <template #fallback>
      Loading...
    </template>
  </Suspense>
</template>