"use client";

import React, { useEffect, useState } from "react";
import Navbar from "../../components/navbar";
import { useWallet } from "../../components/WalletContext";
import { ethers } from "ethers";
import FACTORY_ABI from "../../contractABI/contractABI.json";
import CHAIN_ABI from "../../contractABI/supplyChainABI.json";
import { motion } from "framer-motion";
import Link from "next/link";

/* ---------------- CONSTANTS ---------------- */
const FACTORY_ADDRESS = "0xf2F76eFB368c56817ED0bdeEFC7689DC859Eb467";

/* ---------------- TYPES ---------------- */
type SupplyChain = {
  contractAddress: string;
  creator: string;
  name: string;
  createdAt: number;
};

type ChainStats = {
  requesters: string[];
  committers: string[];
  requestCount: number;
  commitCount: number;
};

/* ---------------- COMPONENT ---------------- */
const Dashboard = () => {
  const { address, connectWallet } = useWallet();

  const [chains, setChains] = useState<SupplyChain[]>([]);
  const [filteredChains, setFilteredChains] = useState<SupplyChain[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("new");

  const [totalRequests, setTotalRequests] = useState(0);
  const [totalCommits, setTotalCommits] = useState(0);

  const [chainStats, setChainStats] = useState<{
    [key: string]: ChainStats;
  }>({});

  /* ---------------- LOAD DATA ---------------- */
  useEffect(() => {
    if (!address) return;

    const loadChains = async () => {
      try {
        const provider = new ethers.BrowserProvider(
          (window as any).ethereum
        );

        const factory = new ethers.Contract(
          FACTORY_ADDRESS,
          FACTORY_ABI.abi,
          provider
        );

        const data = await factory.getAllSupplyChains();

        const allChains: SupplyChain[] = data.map((c: any) => ({
          contractAddress: c.contractAddress,
          creator: c.creator.toLowerCase(),
          name: c.name,
          createdAt: Number(c.createdAt),
        }));

        const userChains = allChains.filter(
          (c) => c.creator === address.toLowerCase()
        );

        setChains(userChains);

        let totalReq = 0;
        let totalCom = 0;

        const statsMap: { [key: string]: ChainStats } = {};

        /* 🔥 LOOP THROUGH EACH CHAIN */
        for (const chain of userChains) {
          try {
            const contract = new ethers.Contract(
              chain.contractAddress,
              CHAIN_ABI.abi,
              provider
            );

            const reqLogs = await contract.queryFilter(
              contract.filters.RequestMinted()
            );

            const commitLogs = await contract.queryFilter(
              contract.filters.CommitMinted()
            );

            const requesters = new Set<string>();
            const committers = new Set<string>();

            reqLogs.forEach((log: any) => {
              requesters.add(log.args.to.toLowerCase());
            });

            commitLogs.forEach((log: any) => {
              committers.add(log.args.to.toLowerCase());
            });

            statsMap[chain.contractAddress] = {
              requesters: Array.from(requesters),
              committers: Array.from(committers),
              requestCount: reqLogs.length,
              commitCount: commitLogs.length,
            };

            totalReq += reqLogs.length;
            totalCom += commitLogs.length;

          } catch (err) {
            console.log("Event fetch error:", err);
          }
        }

        setChainStats(statsMap);
        setTotalRequests(totalReq);
        setTotalCommits(totalCom);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadChains();
  }, [address]);

  /* ---------------- FILTER ---------------- */
  useEffect(() => {
    let temp = [...chains];

    if (search) {
      temp = temp.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    temp.sort((a, b) =>
      sort === "new"
        ? b.createdAt - a.createdAt
        : a.createdAt - b.createdAt
    );

    setFilteredChains(temp);
  }, [search, sort, chains]);

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 pt-32 pb-20">

        {/* HEADER */}
        <h1 className="text-6xl font-black mb-10">
          DASHBOARD <span className="text-emerald-500">SYSTEM</span>
        </h1>

        {/* GLOBAL STATS */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <StatCard label="TOTAL CHAINS" value={chains.length} />
          <StatCard label="TOTAL REQUESTS" value={totalRequests} />
          <StatCard label="TOTAL COMMITS" value={totalCommits} />
        </div>

        {/* SEARCH */}
        <div className="flex gap-4 mb-10">
          <input
            placeholder="Search chain..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-3 bg-zinc-900 border rounded-xl"
          />

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-4 py-3 bg-zinc-900 border rounded-xl"
          >
            <option value="new">Newest</option>
            <option value="old">Oldest</option>
          </select>
        </div>

        {/* CONTENT */}
        {!address ? (
          <div className="text-center py-32">
            <button
              onClick={connectWallet}
              className="px-8 py-4 bg-white text-black rounded-full"
            >
              CONNECT WALLET
            </button>
          </div>
        ) : loading ? (
          <p>Loading...</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">

            {filteredChains.map((chain, i) => {
              const stats = chainStats[chain.contractAddress];

              return (
                <Link
                  key={chain.contractAddress}
                  href={`/chain/${chain.contractAddress}`}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    whileHover={{ scale: 1.05 }}
                    className="p-8 rounded-[2rem] bg-zinc-900/40 border hover:border-emerald-500 cursor-pointer"
                  >

                    <h2 className="text-2xl font-bold mb-2">
                      {chain.name}
                    </h2>

                    <p className="text-xs text-zinc-400 break-all mb-4">
                      {chain.contractAddress}
                    </p>

                    {/* CREATOR */}
                    <p className="text-xs text-zinc-500">Creator</p>
                    <p className="text-xs font-mono mb-4">
                      {chain.creator.slice(0, 6)}...
                      {chain.creator.slice(-4)}
                    </p>

                    {/* COUNTS */}
                    <div className="flex justify-between text-xs mb-4">
                      <span>📦 {stats?.requestCount || 0} Requests</span>
                      <span>⚡ {stats?.commitCount || 0} Commits</span>
                    </div>

                    {/* REQUESTERS */}
                    <p className="text-[10px] text-zinc-500 uppercase">
                      Requesters
                    </p>
                    <div className="text-xs font-mono mb-3">
                      {stats?.requesters?.slice(0, 2).map((a, i) => (
                        <p key={i}>
                          {a.slice(0, 6)}...{a.slice(-4)}
                        </p>
                      ))}
                    </div>

                    {/* COMMITTERS */}
                    <p className="text-[10px] text-zinc-500 uppercase">
                      Committers
                    </p>
                    <div className="text-xs font-mono">
                      {stats?.committers?.slice(0, 2).map((a, i) => (
                        <p key={i}>
                          {a.slice(0, 6)}...{a.slice(-4)}
                        </p>
                      ))}
                    </div>

                    <p className="text-[10px] text-zinc-600 mt-4">
                      {new Date(chain.createdAt * 1000).toLocaleString()}
                    </p>

                  </motion.div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------------- STAT CARD ---------------- */
const StatCard = ({ label, value }: { label: string; value: number }) => (
  <div className="p-6 bg-zinc-900/40 border rounded-2xl">
    <p className="text-xs text-zinc-500">{label}</p>
    <h2 className="text-3xl font-bold mt-2 text-emerald-400">{value}</h2>
  </div>
);

export default Dashboard;