"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ethers } from "ethers";
import Navbar from "../../../../components/navbar";
import { useWallet } from "../../../../components/WalletContext";
import ABI from "../../../../contractABI/supplyChainABI.json";
import { motion } from "framer-motion";

/* ---------------- TYPES ---------------- */

type BatchCommit = {
  requestId: string;
  title: string;
  authority: string;
  location: string;
  file: File | null;
};

export default function BatchCommit() {
  const { address } = useWallet();
  const params = useParams();
  const contractAddress = params.address as string;

  const [contract, setContract] = useState<any>(null);
  const [batch, setBatch] = useState<BatchCommit[]>([
    { requestId: "", title: "", authority: "", location: "", file: null }
  ]);

  const [step, setStep] = useState(1);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const [uris, setUris] = useState<string[]>([]);
  const [requestIds, setRequestIds] = useState<number[]>([]);
  const [txHash, setTxHash] = useState("");

  /* ---------------- INIT ---------------- */

  useEffect(() => {
    if (!address) return;

    const init = async () => {
      const provider = new ethers.BrowserProvider(
        (window as any).ethereum
      );
      const signer = await provider.getSigner();

      const instance = new ethers.Contract(
        contractAddress,
        ABI.abi,
        signer
      );

      setContract(instance);
    };

    init();
  }, [address]);

  /* ---------------- AUTO GPS ---------------- */

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition((pos) => {
      const loc = `${pos.coords.latitude}, ${pos.coords.longitude}`;

      setBatch((prev) =>
        prev.map((item) => ({ ...item, location: loc }))
      );
    });
  }, []);

  /* ---------------- ROW HANDLERS ---------------- */

  const addRow = () => {
    setBatch([
      ...batch,
      { requestId: "", title: "", authority: "", location: "", file: null }
    ]);
  };

  const removeRow = (i: number) => {
    setBatch(batch.filter((_, idx) => idx !== i));
  };

  const updateRow = (i: number, field: string, value: any) => {
    const updated = [...batch];
    (updated[i] as any)[field] = value;
    setBatch(updated);
  };

  /* ---------------- UPLOAD STEP ---------------- */

  const uploadBatch = async () => {
    try {
      setLoading(true);
      setStep(2);
      setStatus("Uploading metadata to IPFS...");

      const uploadedUris: string[] = [];
      const ids: number[] = [];

      for (const item of batch) {
        const formData = new FormData();
        formData.append("ownerAddress", contractAddress);
        formData.append("title", item.title);
        formData.append("authority", item.authority);
        formData.append("location", item.location);
        formData.append("file", item.file!);

        const res = await fetch("http://localhost:5000/api/commit", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        uploadedUris.push(data.metadataUri);
        ids.push(Number(item.requestId));
      }

      setUris(uploadedUris);
      setRequestIds(ids);

      setStep(3);
      setStatus("✅ Metadata uploaded successfully");
    } catch (err) {
      console.error(err);
      setStatus("❌ Upload failed");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- MINT STEP ---------------- */

  const mintBatch = async () => {
    try {
      setLoading(true);
      setStatus("Minting batch commits on-chain...");

      const receivers = uris.map(() => address);

      const tx = await contract.batchMintCommit(
        receivers,
        requestIds,
        uris
      );

      await tx.wait();

      setTxHash(tx.hash);
      setStatus("🚀 Batch Commit Minted Successfully");
    } catch (err) {
      console.error(err);
      setStatus("❌ Mint failed");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar />

      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-emerald-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-32 pb-20 relative z-10">

        {/* HEADER */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-6xl font-black">
            BATCH <span className="text-cyan-500">COMMIT</span>
          </h1>
          <p className="text-zinc-500 text-xs font-mono mt-2 uppercase">
            Upload multiple commits → Link to requests → Mint in one transaction
          </p>
        </motion.div>

        {/* STEP BAR */}
        <div className="mt-6 h-1 bg-white/10 rounded">
          <motion.div
            animate={{ width: `${(step / 3) * 100}%` }}
            className="h-full bg-cyan-500"
          />
        </div>

        {/* STEP 1: INPUT */}
        {step === 1 && (
          <div className="space-y-6 mt-8">

            {batch.map((item, i) => (
              <div
                key={i}
                className="p-6 bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-2xl"
              >
                <div className="flex justify-between mb-4">
                  <p className="text-sm text-zinc-400">
                    Commit #{i + 1}
                  </p>
                  {batch.length > 1 && (
                    <button
                      onClick={() => removeRow(i)}
                      className="text-red-400 text-xs"
                    >
                      REMOVE
                    </button>
                  )}
                </div>

                <input
                  placeholder="Request ID"
                  className="w-full p-3 mb-3 bg-black/40 border rounded"
                  onChange={(e) =>
                    updateRow(i, "requestId", e.target.value)
                  }
                />

                <input
                  placeholder="Title"
                  className="w-full p-3 mb-3 bg-black/40 border rounded"
                  onChange={(e) =>
                    updateRow(i, "title", e.target.value)
                  }
                />

                <input
                  placeholder="Authority"
                  className="w-full p-3 mb-3 bg-black/40 border rounded"
                  onChange={(e) =>
                    updateRow(i, "authority", e.target.value)
                  }
                />

                <input
                  placeholder="Location"
                  className="w-full p-3 mb-3 bg-black/40 border rounded"
                  onChange={(e) =>
                    updateRow(i, "location", e.target.value)
                  }
                />

                <input
                  type="file"
                  onChange={(e) =>
                    updateRow(i, "file", e.target.files?.[0])
                  }
                />
              </div>
            ))}

            <button
              onClick={addRow}
              className="px-6 py-3 bg-white/10 rounded-xl"
            >
              + Add More
            </button>

            <button
              onClick={uploadBatch}
              className="w-full py-4 bg-cyan-500 text-black rounded-xl font-bold"
            >
              {loading ? "Uploading..." : "Upload Batch"}
            </button>
          </div>
        )}

        {/* STATUS */}
        {step >= 2 && (
          <div className="mt-6 text-center font-mono text-sm">
            {status}
          </div>
        )}

        {/* STEP 3: MINT */}
        {step === 3 && (
          <button
            onClick={mintBatch}
            className="mt-6 w-full py-4 bg-emerald-500 text-black rounded-xl font-bold"
          >
            {loading ? "Minting..." : "Confirm Batch Mint"}
          </button>
        )}

        {/* TX */}
        {txHash && (
          <a
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            className="block mt-4 text-center text-cyan-400"
          >
            View Transaction →
          </a>
        )}
      </div>
    </div>
  );
}