import { useEffect, useRef, useState } from "react";

export default function KinesteXPlayer() {
  const iframeRef = useRef(null);
  const [visible, setVisible] = useState(false);

  const srcURL = "https://kinestex.vercel.app";
  const postData = {
    userId: "userid",
    company: "Serdar Kinestex Test",
    key: "de749805ddb1a1c2011823eaa56d1853", // Replace this with your API key
    style: "dark",
    age: 25,
    height: 170,
    weight: 60,
    gender: "Female",
  };

  const sendMessage = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(postData, srcURL);
    }
  };

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== srcURL) return;

      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case "kinestex_loaded":
            sendMessage();
            break;
          case "exercise_completed":
            console.log("Exercise completed:", message.data);
            break;
          case "exit_kinestex":
            setVisible(false);
            break;
          default:
            console.log("Unknown message:", message);
        }
      } catch (err) {
        console.error("Failed to parse message:", err);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <>
      <button onClick={() => setVisible((prev) => !prev)}>
        {visible ? "Close KinesteX" : "Open KinesteX"}
      </button>

      {visible && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999 }}>
          <iframe
            ref={iframeRef}
            src={srcURL}
            frameBorder="0"
            allow="camera; microphone; autoplay; accelerometer; gyroscope; magnetometer"
            sandbox="allow-same-origin allow-scripts"
            allowFullScreen
            style={{ width: "100%", height: "100%" }}
            onLoad={sendMessage}
          />
        </div>
      )}
    </>
  );
}
