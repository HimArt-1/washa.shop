export type SmartStoreImageFieldName =
    | "image_url"
    | "image_front_url"
    | "image_back_url"
    | "ai_reference_front_url"
    | "ai_reference_back_url"
    | "mockup_front_url"
    | "mockup_back_url"
    | "mockup_model_url"
    | "main_image_url"
    | "mockup_image_url"
    | "model_image_url"
    | "base_image_url"
    | "mask_image_url"
    | "overlay_image_url";

export type SmartStoreImageUploaderProps = {
    value: string;
    onChange: (url: string) => void;
    onAssetChange?: (asset: { url: string; path: string | null }) => void;
    folder: string;
    label?: string;
    fieldName?: SmartStoreImageFieldName;
    thumbnailUrl?: string | null;
    thumbnailPath?: string | null;
};
