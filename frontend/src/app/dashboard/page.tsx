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

/* ---------------- COMPONENT ---------------- */

const Dashboard = () => {
  const { address, connectWallet } = useWallet();

  const [chains, setChains] = useState<SupplyChain[]>([]);
  const [filteredChains, setFilteredChains] = useState<SupplyChain[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("new");

  /* -------- STATS -------- */
  const [totalRequests, setTotalRequests] = useState(0);
  const [totalCommits, setTotalCommits] = useState(0);

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

        

let reqCount = 0;
let commitCount = 0;

const fullData: any[] = [];

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

    const requestsMap: any = {};

    /* -------- BUILD REQUESTS -------- */
    reqLogs.forEach((log: any) => {
      const tokenId = Number(log.args.tokenId);

      requestsMap[tokenId] = {
        id: tokenId,
        uri: log.args.uri,
        owner: log.args.to,
        commits: []
      };
    });

    /* -------- ATTACH COMMITS -------- */
    commitLogs.forEach((log: any) => {
      const commitId = Number(log.args.tokenId);
      const requestId = Number(log.args.requestId);

      if (requestsMap[requestId]) {
        requestsMap[requestId].commits.push({
          id: commitId,
          uri: log.args.uri,
          owner: log.args.to
        });
      }
    });

    const requestsArray = Object.values(requestsMap);

    reqCount += requestsArray.length;
    commitCount += commitLogs.length;

    fullData.push({
      chainAddress: chain.contractAddress,
      name: chain.name,
      requests: requestsArray
    });

  } catch (err) {
    console.log("Full fetch error:", err);
  }
}

/* OPTIONAL: STORE FULL DATA */
console.log("FULL SUPPLY CHAIN DATA:", fullData);

setTotalRequests(reqCount);
setTotalCommits(commitCount);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadChains();
  }, [address]);

  /* ---------------- FILTER LOGIC ---------------- */

  useEffect(() => {
    let temp = [...chains];

    if (search) {
      temp = temp.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (sort === "new") {
      temp.sort((a, b) => b.createdAt - a.createdAt);
    } else {
      temp.sort((a, b) => a.createdAt - b.createdAt);
    }

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

        {/* ---------------- STATS BAR ---------------- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">

          <StatCard label="TOTAL CHAINS" value={chains.length} />
          <StatCard label="TOTAL REQUESTS" value={totalRequests} />
          <StatCard label="TOTAL COMMITS" value={totalCommits} />

        </div>

        {/* ---------------- SEARCH + FILTER ---------------- */}
        <div className="flex flex-col md:flex-row gap-4 mb-10">

          <input
            placeholder="Search by chain name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-3 bg-zinc-900 border border-white/10 rounded-xl"
          />

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-4 py-3 bg-zinc-900 border border-white/10 rounded-xl"
          >
            <option value="new">Newest</option>
            <option value="old">Oldest</option>
          </select>

        </div>

        {/* ---------------- CONTENT ---------------- */}
        {!address ? (
          <div className="text-center py-32">
            <button onClick={connectWallet} className="px-8 py-4 bg-white text-black rounded-full">
              CONNECT WALLET
            </button>
          </div>
        ) : loading ? (
          <p>Loading...</p>
        ) : filteredChains.length === 0 ? (
          <p>No results found</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredChains.map((chain, i) => (
             
<Link
                key={chain.contractAddress}
                href={`/chain/${chain.contractAddress}`}
              >
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ scale: 1.04 }}
                  className="group relative p-8 rounded-[2rem] bg-zinc-900/40 backdrop-blur-xl border border-white/5 hover:border-emerald-500/40 transition-all cursor-pointer shadow-xl"
                >
                  {/* HOVER GLOW */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition">
                    <div className="absolute inset-0 rounded-[2rem] bg-emerald-500/10 blur-xl" />
                  </div>

                  {/* CONTENT */}
                  <div className="relative z-10">

                    {/* TITLE */}
                    <h2 className="text-2xl font-bold mb-3 tracking-tight">
                      {chain.name}
                    </h2>

                    {/* ADDRESS */}
                    <p className="text-xs text-zinc-400 font-mono break-all">
                      {chain.contractAddress}
                    </p>

                    {/* META */}
                    <div className="mt-6 space-y-1">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">
                        Creator
                      </p>
                      <p className="text-xs text-zinc-300 font-mono">
                        {chain.creator.slice(0, 6)}...{chain.creator.slice(-4)}
                      </p>
                    </div>

                    {/* TIMESTAMP */}
                    <p className="text-[10px] text-zinc-600 mt-6 font-mono">
                      {new Date(chain.createdAt * 1000).toLocaleString()}
                    </p>

                    {/* TAG */}
                    <div className="mt-4">
                      <span className="text-[9px] px-2 py-1 rounded bg-white/5 border border-white/10 text-zinc-500 font-mono">
                        ON-CHAIN
                      </span>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}

      </div>

      {/* FLOATING CTA */}
      <Link href="/repository">
        <button className="fixed bottom-8 right-8 px-6 py-4 rounded-full bg-emerald-500 text-black font-bold hover:scale-110 transition">
          + CREATE CHAIN
        </button>
      </Link>

    </div>
  );
};

/* ---------------- STAT CARD ---------------- */

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <div className="p-6 bg-zinc-900/40 border border-white/10 rounded-2xl">
    <p className="text-xs text-zinc-500">{label}</p>
    <h2 className="text-3xl font-bold mt-2 text-emerald-400">{value}</h2>
  </div>
);

export default Dashboard;

