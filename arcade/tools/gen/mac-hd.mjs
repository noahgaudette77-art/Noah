#!/usr/bin/env node
/**
 * A Mac's sharper copies of the title hall's captured bosses (the Mac's richer tier, 2026-11-25: the owner raised the
 * Mac's graphics memory budget from 900 MB to about 2 GB). The hall's bosses (boss-<n>-t.glb) were built from the same
 * sources as Boss Rush's (boss-<n>.glb), the same picture laid out the same way, at half the size and less: 1024 px
 * colour and glow, 512 px surface and normal. Each copy is the hall's boss as it is (its shape, skeleton, clips and
 * joint caps untouched) wearing the Boss Rush boss's own pictures: 2048 px colour and glow, 1024 px surface and normal.
 * A Mac fetches the copy in place of the hall's boss (Assets: "-hd"); a phone never does. No provider is called.
 *
 *   node tools/gen/mac-hd.mjs
 *   writes arcade/assets/models/boss-<n>-t-hd.glb for n = 1..11
 *
 * (Boss Rush's wizard in its 4096 px source colour was made here too, and removed: where the arena draws it, 95% of its
 * pixels take two texels or more of a 4096 map, drawn down through the map's smaller copies. docs/master/mactier/.)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTMeshoptCompression } from "@gltf-transform/extensions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const M = path.join(HERE, "..", "..", "assets", "models");
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const SLOTS = [["getBaseColorTexture", "baseColor"], ["getEmissiveTexture", "emissive"], ["getNormalTexture", "normal"], ["getMetallicRoughnessTexture", "metalRough"]];
for (let n = 1; n <= 11; n++) {
  const tFile = path.join(M, `boss-${n}-t.glb`), fFile = path.join(M, `boss-${n}.glb`);
  if (!fs.existsSync(tFile) || !fs.existsSync(fFile)) continue;
  const t = await io.read(tFile), f = await io.read(fFile);
  const tm = t.getRoot().listMaterials(), fm = f.getRoot().listMaterials();
  if (tm.length !== fm.length) throw new Error(`boss-${n}: ${tm.length} materials against ${fm.length}`);
  const swapped = [];
  tm.forEach((m, i) => {
    for (const [get, name] of SLOTS) {
      const a = m[get](), b = fm[i][get]();
      if (!a && !b) continue;
      if (!a || !b) throw new Error(`boss-${n}: material ${i} ${name} in one and not the other`);
      a.setImage(b.getImage()).setMimeType(b.getMimeType());
      const [w, h] = b.getSize() || [0, 0];
      swapped.push(`${name} ${w}`);
    }
  });
  // (written as the hall's own file was: the same compression of its geometry, nothing quantized again)
  t.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  const out = path.join(M, `boss-${n}-t-hd.glb`);
  await io.write(out, t);
  console.log(`boss-${n}-t-hd.glb`, (fs.statSync(out).size / 1048576).toFixed(2) + " MB", "(" + (fs.statSync(tFile).size / 1048576).toFixed(2) + " MB the hall's);", swapped.join(", "));
}

