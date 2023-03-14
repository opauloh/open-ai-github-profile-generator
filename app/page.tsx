"use client";
import { useState } from "react";
import { useMutation, useQuery } from "react-query";

export default function Home() {
  const [userName, setUserName] = useState<string>("");

  const [executionId, setExecutionId] = useState<string | null>(null);

  const [mods, setMods] = useState<string[]>([]);

  const toggleMod = (mod: string) => {
    if (mods.includes(mod)) {
      setMods(mods.filter((m) => m !== mod));
    } else {
      setMods([...mods, mod]);
    }
  };

  const hasMod = (mod: string) => {
    return mods.includes(mod);
  };

  const { mutate } = useMutation(
    async () => {
      const req = await fetch(`/api/githubProfile/${userName}/${mods}`, {
        method: "POST",
      });
      return await req.json();
    },
    {
      onSuccess: ({ id }) => {
        setExecutionId(id);
      },
    }
  );

  const { data } = useQuery(
    "queryJobStatus",
    async () => {
      const req = await fetch(`/api/githubProfile/${executionId}`, {});
      return await req.json();
    },
    {
      enabled: !!executionId,
      refetchInterval: 1000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
      onSuccess(data) {
        if (data.result || data.state === "cancelled") {
          setExecutionId(null);
        }
      },
    }
  );

  const hasStarted = data?.state === "started" || data?.state === "created";

  return (
    <main className="container">
      <h1>GitHub README AI Generator</h1>
      <p>Let OpenAI generate a personalized GitHub Profile README for you</p>
      <div className="mods">
        <div>Mods:</div>
        <button
          onClick={() => toggleMod("rick_astley")}
          className={`button ${hasMod("rick_astley") ? "active" : ""}`}
        >
          Rick Astley
        </button>
        <button
          onClick={() => toggleMod("yoda")}
          className={`button ${hasMod("yoda") ? "active" : ""}`}
        >
          Master Yoda
        </button>
      </div>
      <div className="name">
        <input
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          className="input"
          placeholder="Enter your GitHub username"
          disabled={hasStarted}
        />
        <button
          onClick={() => mutate()}
          className="buttonPrimary"
          disabled={hasStarted}
        >
          {hasStarted ? "Generating ..." : "Generate"}
        </button>
      </div>
      {data && data.result && (
        <div className="result codeblock-container">
          <div className="codeblock-content">{data.result}</div>
        </div>
      )}
    </main>
  );
}
