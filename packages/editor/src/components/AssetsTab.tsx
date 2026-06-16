import { useMemo, useRef } from "react";
import { useProjectStore } from "../store/projectStore.js";
import {
  assetPathForUpload,
  categorizeAssetPath,
  formatAssetSize,
  isImageAssetPath,
  listProjectAssetPaths,
  type AssetCategory,
} from "../lib/project/projectAssets.js";

function AssetPreview({ path, data }: { path: string; data: Uint8Array }) {
  const url = useMemo(() => {
    if (!isImageAssetPath(path)) {
      return null;
    }
    const copy = new Uint8Array(data);
    return URL.createObjectURL(new Blob([copy]));
  }, [path, data]);

  if (!url) {
    return <span className="asset-preview asset-preview--none">—</span>;
  }

  return (
    <img
      src={url}
      alt=""
      className="asset-preview"
      onLoad={() => URL.revokeObjectURL(url)}
    />
  );
}

export function AssetsTab() {
  const project = useProjectStore((s) => s.project);
  const projectAssets = useProjectStore((s) => s.projectAssets);
  const addProjectAsset = useProjectStore((s) => s.addProjectAsset);
  const removeProjectAsset = useProjectStore((s) => s.removeProjectAsset);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const bgmInputRef = useRef<HTMLInputElement>(null);
  const seInputRef = useRef<HTMLInputElement>(null);

  const paths = listProjectAssetPaths(projectAssets);

  const ingestFiles = async (category: AssetCategory, files: FileList | null) => {
    if (!files) {
      return;
    }
    for (const file of files) {
      const path = assetPathForUpload(category, file.name);
      const data = new Uint8Array(await file.arrayBuffer());
      addProjectAsset(path, data);
    }
  };

  if (!project) {
    return (
      <section className="panel" data-testid="assets-tab">
        <p>プロジェクトを読み込んでください。</p>
      </section>
    );
  }

  return (
    <section className="panel" data-testid="assets-tab">
      <h2>素材</h2>
      <p className="hint">
        画像・BGM・SE を追加すると、フォルダ保存と書き出し zip の <code>assets/</code> に含まれます。
      </p>

      <div className="toolbar">
        <button type="button" onClick={() => imageInputRef.current?.click()} data-testid="btn-add-image">
          画像を追加
        </button>
        <button type="button" onClick={() => bgmInputRef.current?.click()} data-testid="btn-add-bgm">
          BGMを追加
        </button>
        <button type="button" onClick={() => seInputRef.current?.click()} data-testid="btn-add-se">
          SEを追加
        </button>
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        hidden
        onChange={(e) => {
          void ingestFiles("images", e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={bgmInputRef}
        type="file"
        accept="audio/ogg,audio/mpeg,audio/wav,.ogg,.mp3,.wav"
        multiple
        hidden
        onChange={(e) => {
          void ingestFiles("bgm", e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={seInputRef}
        type="file"
        accept="audio/ogg,audio/mpeg,audio/wav,.ogg,.mp3,.wav"
        multiple
        hidden
        onChange={(e) => {
          void ingestFiles("se", e.target.files);
          e.target.value = "";
        }}
      />

      {paths.length === 0 ? (
        <p data-testid="assets-empty">素材はまだありません。</p>
      ) : (
        <table className="asset-table" data-testid="assets-table">
          <thead>
            <tr>
              <th>プレビュー</th>
              <th>パス</th>
              <th>種別</th>
              <th>サイズ</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {paths.map((path) => {
              const data = projectAssets[path]!;
              const category = categorizeAssetPath(path);
              return (
                <tr key={path} data-testid={`asset-row-${path.replace(/\//g, "_")}`}>
                  <td>
                    <AssetPreview path={path} data={data} />
                  </td>
                  <td>
                    <code>{path}</code>
                  </td>
                  <td>{category}</td>
                  <td>{formatAssetSize(data.byteLength)}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => removeProjectAsset(path)}
                      data-testid={`btn-remove-asset-${path.replace(/\//g, "_")}`}
                    >
                      削除
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
