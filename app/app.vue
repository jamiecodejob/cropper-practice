<script setup lang="ts">
import { ref, onMounted, nextTick, onBeforeUnmount } from "vue";

/** 狀態 */
const ready = ref(false); // Web Components 是否已定義
const imgSrc = ref<string | undefined>(); // <cropper-image :src> 顯示用
const previewUrl = ref<string | undefined>(); // 裁切後 JPG 預覽（物件 URL）

/** DOM refs（Web Components 實例） */
const cropCanvas = ref<any>(null);
const cropImg = ref<any>(null);
const cropSel = ref<any>(null);

/** 檔案 input */
const fileEl = ref<HTMLInputElement | null>(null);
const pickFile = () => fileEl.value?.click();

/** 物件 URL 清理 */
let objUrl: string | null = null;
let outUrl: string | null = null;

/** 僅在 client 定義 Web Components（default 匯入！） */
onMounted(async () => {
  if (!process.client) return;

  if (!customElements.get("cropper-canvas")) {
    const CropperCanvas = (await import("@cropper/element-canvas")).default;
    const CropperImage = (await import("@cropper/element-image")).default;
    const CropperSelection = (await import("@cropper/element-selection"))
      .default;
    const CropperHandle = (await import("@cropper/element-handle")).default;
    const CropperShade = (await import("@cropper/element-shade")).default;
    const CropperGrid = (await import("@cropper/element-grid")).default;
    const CropperCrosshair = (await import("@cropper/element-crosshair"))
      .default;

    CropperCanvas.$define();
    CropperImage.$define();
    CropperSelection.$define();
    CropperHandle.$define();
    CropperShade.$define();
    CropperGrid.$define();
    CropperCrosshair.$define();
  }

  ready.value = true;
  await customElements.whenDefined("cropper-image");
  await nextTick();
});

/** 讀檔 → 顯示到裁切面板 */
async function onChosen(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  // 題示若你只接受 JPG，可打開這段檢查：
  // if (!/^image\/jpe?g$/i.test(file.type)) return alert('請選擇 JPG')

  // 釋放舊 URL
  if (objUrl) URL.revokeObjectURL(objUrl);
  objUrl = URL.createObjectURL(file);

  // 綁到 <cropper-image :src>
  imgSrc.value = objUrl;

  // 圖片載入後，初始化選取框（置中正方形）
  cropImg.value?.addEventListener("load", initSelectionBox, { once: true });
}

/** 初始化選框：置中、1:1、盡量大（面板 80%） */
function initSelectionBox() {
  const c = cropCanvas.value as HTMLElement | null;
  if (!c || !cropSel.value) return;

  const rect = c.getBoundingClientRect();
  const size = Math.min(500, Math.min(rect.width, rect.height) * 0.8);
  const left = (rect.width - size) / 2;
  const top = (rect.height - size) / 2;

  cropSel.value.$setAspectRatio?.(1);
  cropSel.value.$setCropBoxData?.({ left, top, width: size, height: size });
}

/** 控制：放大/縮小/旋轉/重置（作用在影像與選框） */
const zoomIn = () => cropImg.value?.$scale(1.15);
const zoomOut = () => cropImg.value?.$scale(1 / 1.15);
const rotate = (deg: number) => cropImg.value?.$rotate(deg);
const resetAll = () => {
  cropImg.value?.$resetTransform();
  cropSel.value?.$reset();
};

/** 裁切：輸出 500×500 JPG → 預覽 & 上傳 */
async function cropToJpgAndUpload() {
  if (!cropSel.value) return alert("請先選擇範圍");

  // 1) 產生固定 500×500 的 Canvas
  const canvas: HTMLCanvasElement = await cropSel.value.$toCanvas({
    width: 500,
    height: 500,
  });

  // 2) Canvas → JPG Blob（0.92 品質）
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob 失敗"))),
      "image/jpeg",
      0.92
    );
  });

  // 3) 預覽（建立物件 URL）
  if (outUrl) URL.revokeObjectURL(outUrl);
  outUrl = URL.createObjectURL(blob);
  previewUrl.value = outUrl;

  // 4) 上傳（FormData）
  const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
  const fd = new FormData();
  fd.append("file", file);

  try {
    // 你可以把 /api/avatar 換成你的後端路徑
    await $fetch("/api/avatar", { method: "POST", body: fd });
    // 成功可提示或更新 avatar
  } catch (err) {
    console.error("upload error", err);
    alert("上傳失敗");
  }
}

/** 清理物件 URL（避免記憶體外漏） */
onBeforeUnmount(() => {
  if (objUrl) URL.revokeObjectURL(objUrl);
  if (outUrl) URL.revokeObjectURL(outUrl);
});
</script>

<template>
  <div class="p-6 space-y-4">
    <!-- 選檔 -->
    <div class="flex items-center gap-3">
      <button class="px-3 py-2 rounded bg-black text-white" @click="pickFile">
        選擇圖片
      </button>
      <input
        ref="fileEl"
        type="file"
        class="hidden"
        accept="image/*"
        @change="onChosen"
      />
      <span class="text-gray-600 text-sm">{{
        imgSrc ? "已選擇圖片" : "請先選擇圖片"
      }}</span>
    </div>

    <!-- 裁切面板（固定 500×500） -->
    <ClientOnly>
      <div
        v-if="ready"
        style="width: 500px; height: 500px; border: 1px solid #ddd"
      >
        <cropper-canvas
          background
          style="width: 100%; height: 100%; display: block"
          ref="cropCanvas"
        >
          <cropper-image
            ref="cropImg"
            :src="imgSrc"
            alt="Picture"
            rotatable
            scalable
            skewable
            translatable
          />
          <cropper-shade hidden />
          <cropper-handle action="select" plain />
          <cropper-selection
            ref="cropSel"
            initial-coverage="0.5"
            movable
            resizable
          >
            <cropper-grid role="grid" covered />
            <cropper-crosshair centered />
            <cropper-handle
              action="move"
              theme-color="rgba(255,255,255,0.35)"
            />
            <cropper-handle action="n-resize" />
            <cropper-handle action="e-resize" />
            <cropper-handle action="s-resize" />
            <cropper-handle action="w-resize" />
            <cropper-handle action="ne-resize" />
            <cropper-handle action="nw-resize" />
            <cropper-handle action="se-resize" />
            <cropper-handle action="sw-resize" />
          </cropper-selection>
        </cropper-canvas>
      </div>
    </ClientOnly>

    <!-- 控制 -->
    <div class="flex items-center gap-2">
      <button class="px-3 py-1 rounded bg-gray-200" @click="zoomOut">
        縮小
      </button>
      <button class="px-3 py-1 rounded bg-gray-200" @click="zoomIn">
        放大
      </button>
      <button class="px-3 py-1 rounded bg-gray-200" @click="rotate(-90)">
        左旋
      </button>
      <button class="px-3 py-1 rounded bg-gray-200" @click="rotate(90)">
        右旋
      </button>
      <button class="px-3 py-1 rounded bg-gray-300" @click="resetAll">
        重置
      </button>
      <button
        class="px-3 py-1 rounded bg-red-600 text-white"
        @click="cropToJpgAndUpload"
      >
        裁切為 JPG 並上傳
      </button>
    </div>

    <!-- 裁切後預覽 -->
    <div v-if="previewUrl" class="space-y-2">
      <div>裁切結果（JPG 500×500）</div>
      <img
        :src="previewUrl"
        class="w-[250px] h-[250px] object-cover border rounded"
      />
      <a
        :href="previewUrl"
        download="avatar.jpg"
        class="text-blue-600 underline"
        >下載 JPG</a
      >
    </div>
  </div>
</template>

<style>
/* 保險：Web Components 統一 block 呈現 */
cropper-canvas,
cropper-image,
cropper-selection {
  display: block;
}
</style>
