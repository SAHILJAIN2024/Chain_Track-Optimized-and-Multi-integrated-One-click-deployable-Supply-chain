"use client";

import React, { useState, useEffect, FormEvent } from "react";
import { ethers } from "ethers";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/navbar";
import { useWallet } from "../components/WalletContext";
import FACTORY_ABI from "../contractABI/contractABI.json";

/* ---------------- TYPES ---------------- */

interface IoTData {
  deviceId: string;
  type: string;
  location: string;
  timestamp: number;
  data: string;
}

/* ---------------- COMPONENT ---------------- */

export default function CreateIOTSupplyChain() {
  const { address } = useWallet();

  const [contract, setContract] = useState<any>(null);

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");

  const [creators, setCreators] = useState("");
  const [committers, setCommitters] = useState("");

  const [file, setFile] = useState<File | null>(null);

  /* -------- IoT -------- */
  const [iotApi, setIotApi] = useState("");
  const [iotData, setIotData] = useState<IoTData[]>([]);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const FACTORY_ADDRESS = "0xf2F76eFB368c56817ED0bdeEFC7689DC859Eb467";

  /* ---------------- CONTRACT ---------------- */

  useEffect(() => {
    if (!address) return;

    const setup = async () => {
      const provider = new ethers.BrowserProvider(
        (window as any).ethereum
      );
      const signer = await provider.getSigner();

      const instance = new ethers.Contract(
        FACTORY_ADDRESS,
        FACTORY_ABI.abi,
        signer
      );

      setContract(instance);
    };

    setup();
  }, [address]);

  /* ---------------- FETCH IoT DATA ---------------- */

  const fetchIoT = async () => {
    try {
      setStatus("Fetching IoT data...");

      const res = await fetch(iotApi);
      const data = await res.json();

      setIotData(data);
      setStatus(`✅ ${data.length} IoT records loaded`);
    } catch (err) {
      console.error(err);
      setStatus("❌ Failed to fetch IoT data");
    }
  };

  /* ---------------- DEPLOY + BATCH ---------------- */

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!contract || !address) return;

    try {
      setLoading(true);

      /* -------- DEPLOY CONTRACT -------- */
      setStatus("Deploying supply chain...");

      const creatorArray = creators
        ? creators.split(",").map((a) => a.trim())
        : [address];

      const committerArray = committers
        ? committers.split(",").map((a) => a.trim())
        : [address];

      const tx = await contract.createSupplyChain(
        name,
        address,
        creatorArray,
        committerArray
      );

      const receipt = await tx.wait();

      let deployedAddress = "";

      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed?.name === "SupplyChainCreated") {
            deployedAddress = parsed.args.contractAddress;
          }
        } catch {}
      }

      /* -------- PROCESS IoT INTO BATCH -------- */

      if (iotData.length > 0) {
        setStatus("Processing IoT batch...");

        const formData = new FormData();

        iotData.forEach((item) => {
          formData.append("titles", item.type);
          formData.append("Authority", item.deviceId);
          formData.append("locations", item.location);
          formData.append("descriptions", item.data);
        });

        /* -------- SEND TO BACKEND -------- */
        setStatus("Uploading IoT batch to backend...");

        const res = await fetch("http://localhost:5000/api/iot-batch", {
          method: "POST",
          body: formData,
        });

        const result = await res.json();

        setStatus(`🚀 IoT batch ready (${result.uris.length} items)`);
      }

      setStatus(`✅ Deployed: ${deployedAddress}`);

    } catch (err: any) {
      console.error(err);
      setStatus("❌ ERROR: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar />

      <main className="pt-32 pb-20 px-6 max-w-5xl mx-auto">

        <h1 className="text-6xl font-black mb-10">
          IOT ENABLED <span className="text-emerald-500">SUPPLY CHAIN</span>
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">

          <input
            placeholder="Supply Chain Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-4 bg-zinc-900 rounded-xl"
          />

          <input
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full p-4 bg-zinc-900 rounded-xl"
          />

          {/* IoT API INPUT */}
          <input
            placeholder="IoT API Endpoint (http://...)"
            value={iotApi}
            onChange={(e) => setIotApi(e.target.value)}
            className="w-full p-4 bg-black border border-cyan-500/30 rounded-xl"
          />

          <button
            type="button"
            onClick={fetchIoT}
            className="bg-cyan-500 px-6 py-3 rounded-xl text-black"
          >
            Fetch IoT Data
          </button>

          {/* PREVIEW */}
          {iotData.length > 0 && (
            <div className="bg-black p-4 rounded-xl max-h-60 overflow-y-auto">
              {iotData.map((d, i) => (
                <div key={i} className="text-xs border-b border-white/10 py-2">
                  {d.deviceId} → {d.data}
                </div>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-emerald-500 text-black rounded-xl font-bold"
          >
            {loading ? "PROCESSING..." : "DEPLOY + PROCESS IOT"}
          </button>

        </form>

      </main>

      <AnimatePresence>
        {status && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-emerald-500 text-black px-6 py-3 rounded-full"
          >
            {status}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}