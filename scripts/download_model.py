from huggingface_hub import snapshot_download
from pathlib import Path

# Downloads the CLIP model once at build time. The resulting folder is packaged
# with the app, so end users do not need internet on first launch.
snapshot_download(
    repo_id="Xenova/clip-vit-base-patch32",
    local_dir=Path("models") / "Xenova" / "clip-vit-base-patch32",
)
print("Model saved under models/Xenova/clip-vit-base-patch32")
