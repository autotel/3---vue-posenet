<script setup lang="ts">
import AnalysisPlotter from './AnalysisPlotter.vue';
import HeadsUp from './HeadsUp.vue';
import TensorFlowPose from './TensorFlowPose.vue';
</script>
<template>
  <Suspense>

    <TensorFlowPose />
    <template #fallback>
      Loading...
    </template>
  </Suspense>
  <HeadsUp />
  <AnalysisPlotter />
</template>