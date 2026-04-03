"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import CONTRACT_ABI from "../../../contractABI/supplyChainABI.json";
import { useWallet } from "../../../components/WalletContext";
import Navbar from "../../../components/navbar";
import { fetchIPFS, RenderIPFSContent } from "../../../components/IPFSRenderer";
import { motion } from "framer-motion";

/* ---------------- TYPES ---------------- */

type Request = {
  tokenId: number;
  to: string;
  uri: string;
};

type Commit = {
  tokenId: number;
  requestId: number;
  to: string;
  uri: string;
};

/* ---------------- COMPONENT ---------------- */

export default function ChainPage() {
  const router = useRouter();
  const { address } = useWallet();
  const params = useParams();
  const contractAddress = params.address as string;

  const [requests, setRequests] = useState<Request[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [metadata, setMetadata] = useState<Record<string, any>>({});

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
        CONTRACT_ABI.abi,
        signer
      );

      await loadEvents(instance, address);
    };

    init();
  }, [address, contractAddress]);

  /* ---------------- LOAD EVENTS ---------------- */

  const loadEvents = async (instance: any, wallet: string) => {
    const reqLogs = await instance.queryFilter(
      instance.filters.RequestMinted()
    );

    const comLogs = await instance.queryFilter(
      instance.filters.CommitMinted()
    );

    const allRequests: Request[] = reqLogs.map((log: any) => ({
      tokenId: Number(log.args.tokenId),
      to: log.args.to.toLowerCase(),
      uri: log.args.uri,
    }));

    const allCommits: Commit[] = comLogs.map((log: any) => ({
      tokenId: Number(log.args.tokenId),
      requestId: Number(log.args.requestId),
      to: log.args.to.toLowerCase(),
      uri: log.args.uri,
    }));

    const userAddress = wallet.toLowerCase();

    const userRequests = allRequests.filter(
      (r: Request) => r.to === userAddress
    );

    const userRequestIds = userRequests.map((r) => r.tokenId);

    const userCommits = allCommits.filter(
      (c: Commit) =>
        c.to === userAddress ||
        userRequestIds.includes(c.requestId)
    );

    setRequests(userRequests);
    setCommits(userCommits);
  };

  /* ---------------- LOAD IPFS ---------------- */

  useEffect(() => {
    const load = async () => {
      const cache: Record<string, any> = {};

      for (const r of requests) {
        if (!metadata[r.tokenId]) {
          cache[r.tokenId] = await fetchIPFS(r.uri);
        }
      }

      for (const c of commits) {
        if (!metadata[c.tokenId]) {
          cache[c.tokenId] = await fetchIPFS(c.uri);
        }
      }

      setMetadata((prev) => ({ ...prev, ...cache }));
    };

    if (requests.length || commits.length) load();
  }, [requests, commits]);

  /* ---------------- STATUS ---------------- */

  const getStatus = (requestId: number) => {
    const related = commits.filter((c) => c.requestId === requestId);

    if (related.length === 0) return { label: "CREATED", step: 0 };
    if (related.length < 3) return { label: "IN PROGRESS", step: 1 };
    return { label: "COMPLETED", step: 2 };
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar />

      {/* BACKGROUND GLOW */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-cyan-500/10 blur-[120px]" />
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-32 pb-20 relative z-10">

        {/* HEADER */}
        <h1 className="text-5xl md:text-6xl font-black mb-10">
          CHAIN <span className="text-emerald-500">DETAILS</span>
        </h1>

        {/* ACTION BUTTONS */}
        <div className="flex gap-4 mb-12">
          <button
            onClick={() => router.push(`/chain/${contractAddress}/create-request`)}
            className="px-6 py-3 bg-emerald-500 text-black rounded-full font-bold hover:scale-105 transition"
          >
            + CREATE REQUEST
          </button>

          <button
            onClick={() => router.push(`/chain/${contractAddress}/add-commit`)}
            className="px-6 py-3 border border-white/10 rounded-full hover:bg-white hover:text-black transition"
          >
            + ADD COMMIT
          </button>
          <button
            onClick={() => router.push(`/chain/${contractAddress}/batch-request`)}
            className="px-6 py-3 bg-emerald-500 text-black rounded-full font-bold hover:scale-105 transition"
          >
            + CREATE BATCH REQUEST
          </button>
          <button
            onClick={() => router.push(`/chain/${contractAddress}/batch-commit`)}
            className="px-6 py-3 border border-white/10 rounded-full hover:bg-white hover:text-black transition"
          >
            + CREATE COMMIT REQUEST
          </button>
        </div>

        {/* REQUESTS */}
        <div className="space-y-10">
          {requests.map((req, idx) => {
            const status = getStatus(req.tokenId);

            return (
              <motion.div
                key={req.tokenId}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="p-8 rounded-[2rem] bg-zinc-900/40 border border-white/5 backdrop-blur-xl"
              >
                {/* HEADER */}
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">
                    Request #{req.tokenId}
                  </h2>

                  <span className="text-xs font-mono text-emerald-400">
                    {status.label}
                  </span>
                </div>

                {/* PROGRESS BAR */}
                <div className="h-1 w-full bg-white/5 rounded mb-6">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${(status.step / 2) * 100}%` }}
                  />
                </div>

                {/* METADATA */}
                <RenderIPFSContent data={metadata[req.tokenId]} />

                {/* COMMITS */}
                <div className="mt-6 space-y-4">
                  {commits
                    .filter((c) => c.requestId === req.tokenId)
                    .map((c) => (
                      <div
                        key={c.tokenId}
                        className="p-4 bg-black/40 border border-white/5 rounded-xl"
                      >
                        <p className="text-xs text-zinc-400 mb-2">
                          Commit #{c.tokenId}
                        </p>

                        <RenderIPFSContent data={metadata[c.tokenId]} />
                      </div>
                    ))}
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </div>
  );
}