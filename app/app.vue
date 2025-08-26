<script setup lang="ts">
import { ref, nextTick, onBeforeUnmount } from "vue";
import type Cropper from "cropperjs";

const fileUploadEl = ref<HTMLInputElement | null>(null);
const editorImgEl = ref<HTMLImageElement | null>(null);

const isOpen = ref(false);
const tempUrl = ref<string>("");
const avatarUrl = ref<string>("https://picsum.photos/400");

const cropper = ref<Cropper | null>(null);

const pickImage = () => fileUploadEl.value?.click();

// 選擇檔案
async function onSelectedFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  // 釋放舊 URL
  if (tempUrl.value) URL.revokeObjectURL(tempUrl.value);
  tempUrl.value = URL.createObjectURL(file);

  const { default: CropperJS } = await import("cropperjs");

  // 如果 modal 還沒開，先打開
  if (!isOpen.value) {
    isOpen.value = true;
    await nextTick();
  }

  const img = editorImgEl.value;
  if (!img) return;

  // 更新圖片與 cropper
  img.onload = () => {
    cropper.value?.destroy?.(); // 保險：銷毀舊的
    cropper.value = new CropperJS(img);
  };
  img.src = tempUrl.value;
}

// ---- 操作 ----
const ZOOM_FACTOR = 1.15;
function zoomIn() {
  cropper.value?.getCropperImage()?.$scale(ZOOM_FACTOR);
}
function zoomOut() {
  cropper.value?.getCropperImage()?.$scale(1 / ZOOM_FACTOR);
}
function rotate(deg: number) {
  cropper.value?.getCropperImage()?.$rotate(deg);
}
function resetCropper() {
  cropper.value?.getCropperImage()?.$resetTransform();
  cropper.value?.getCropperSelection()?.$reset();
}

async function onCrop() {
  const selection = cropper.value?.getCropperSelection();
  if (!selection) return alert("沒有選取框");

  const canvas = await selection.$toCanvas({ width: 400, height: 400 });
  avatarUrl.value = canvas.toDataURL("image/jpeg", 0.92);
  onClose();
}

function onClose() {
  cropper.value = null;
  isOpen.value = false;
  if (tempUrl.value) {
    URL.revokeObjectURL(tempUrl.value);
    tempUrl.value = "";
  }
}

onBeforeUnmount(() => {
  if (tempUrl.value) URL.revokeObjectURL(tempUrl.value);
});
</script>

<template>
  <div class="p-6 flex flex-col items-center gap-4">
    <!-- 頭像預覽 -->
    <div class="relative h-[150px] w-[150px] overflow-hidden rounded-full">
      <img
        :src="avatarUrl"
        alt="avatar"
        class="h-[150px] w-[150px] rounded-full object-cover select-none"
        draggable="false"
      />
      <button
        type="button"
        class="absolute bottom-0 flex h-10 w-full items-center justify-center bg-black/40 text-white"
        @click="pickImage"
      >
        編輯
      </button>
    </div>

    <input
      ref="fileUploadEl"
      type="file"
      hidden
      accept="image/png,image/jpeg,image/webp"
      @change="onSelectedFile"
    />

    <!-- 裁切 Modal -->
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="onClose"
    >
      <div class="w-full max-w-[640px] rounded-lg bg-white p-4 shadow-xl">
        <div class="max-h-[60vh] overflow-hidden rounded-md">
          <img
            ref="editorImgEl"
            class="block max-w-full select-none"
            draggable="false"
          />
        </div>

        <!-- 控制鈕 -->
        <div class="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div class="space-x-2">
            <button
              class="rounded bg-gray-500 px-3 py-[6px] text-white"
              @click="zoomOut"
            >
              縮小
            </button>
            <button
              class="rounded bg-gray-500 px-3 py-[6px] text-white"
              @click="zoomIn"
            >
              放大
            </button>
            <button
              class="rounded bg-gray-500 px-3 py-[6px] text-white"
              @click="rotate(-90)"
            >
              左旋
            </button>
            <button
              class="rounded bg-gray-500 px-3 py-[6px] text-white"
              @click="rotate(90)"
            >
              右旋
            </button>
            <button
              class="rounded bg-gray-400 px-3 py-[6px] text-white"
              @click="resetCropper"
            >
              重置
            </button>
          </div>

          <div class="space-x-2">
            <button
              class="rounded bg-gray-300 px-3 py-[6px] text-gray-800"
              @click="onClose"
            >
              取消
            </button>
            <button
              class="rounded bg-red-600 px-3 py-[6px] text-white"
              @click="onCrop"
            >
              設定為大頭貼
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
