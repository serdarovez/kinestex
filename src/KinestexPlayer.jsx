import { useEffect, useRef, useState, useCallback } from "react";

// --- Configuration for all KinesteX Integration Options ---
// This object defines the properties for each integration type,
// including their URL paths, required inputs, and specific postData parameters.
const INTEGRATION_OPTIONS = {
  MAIN: {
    name: "Main View (Plan Category)",
    path: "", // Base path for the main view
    input: {
      type: "select",
      label: "Plan Category",
      options: ["Cardio", "Strength", "Weight Management", "Rehabilitation"],
    },
    defaultInput: "Cardio",
    postDataMap: (input) => ({ planCategory: input }),
  },
  PLAN: {
    name: "Individual Plan View",
    path: "/plan/", // Requires plan ID/name appended to path
    input: {
      type: "text",
      label: "Plan Name or ID",
      placeholder: "e.g., Circuit Training or 22B3qRU2r75hVXHgGiGx",
    },
    defaultInput: "Circuit Training", // Example ID/Name
    urlParam: true, // Indicates that the input should be part of the URL path
  },
  WORKOUT: {
    name: "Individual Workout View",
    path: "/workout/", // Requires workout ID/name appended to path
    input: {
      type: "text",
      label: "Workout Name or ID",
      placeholder: "e.g., Fitness Lite or 9zE1kzOzpU5d5dAJrPOY",
    },
    defaultInput: "Fitness Lite", // Example ID/Name
    urlParam: true,
  },
  CHALLENGE: {
    name: "Challenge View",
    path: "/challenge",
    input: {
      type: "text",
      label: "Challenge Exercise ID",
      placeholder: "e.g., jz73VFlUyZ9nyd64OjRb",
    },
    defaultInput: "jz73VFlUyZ9nyd64OjRb", // Example ID
    additionalInputs: {
      countdown: {
        type: "number",
        label: "Duration (seconds)",
        defaultValue: 100,
      },
    },
    postDataMap: (input, additional) => ({
      exercise: input,
      countdown: additional.countdown,
      showLeaderboard: true, // Default to true as per docs
    }),
  },
  LEADERBOARD: {
    name: "Leaderboard View",
    path: "/leaderboard/", // Has query param for userId, exercise in postData
    input: {
      type: "text",
      label: "Leaderboard Exercise Name",
      placeholder: "e.g., Squats",
    },
    defaultInput: "Squats",
    additionalInputs: {
      username: {
        type: "text",
        label: "Highlight Username (optional)",
        defaultValue: "",
      },
    },
    urlQueryParam: (userId) => `userId=${userId}`, // Adds userId to URL query
    postDataMap: (input, additional) => ({
      exercise: input,
      isHideHeaderMain: true, // Example custom param
      username: additional.username || undefined, // Only send if provided
    }),
  },
  EXPERIENCE: {
    name: "AI Experience View",
    path: "/experiences/", // Requires experience name appended to path
    input: {
      type: "text",
      label: "Experience Name",
      placeholder: "e.g., assessment",
    },
    defaultInput: "assessment", // Your specific "assessment" experience
    urlParam: true,
    postDataMap: () => ({ exercise: "balloonpop" }), // Specific exercise for this experience
  },
  CAMERA: {
    name: "Camera Component (Motion Analysis)",
    path: "/camera",
    input: {
      type: "text",
      label: "Initial Exercise ID",
      placeholder: "e.g., CnOcLpBo5RAyznE0z3jt",
    },
    defaultInput: "CnOcLpBo5RAyznE0z3jt", // Example ID
    additionalInputs: {
      exercises: {
        type: "text",
        label: "All Exercises (comma-separated)",
        defaultValue: "CnOcLpBo5RAyznE0z3jt,Squats,Lunges",
      },
      switchExercise: {
        type: "text",
        label: "Switch Exercise To",
        defaultValue: "Squats",
      },
      // Common Custom Parameters for Camera Component
      includeRealtimeAccuracy: {
        type: "checkbox",
        label: "Include Real-time Accuracy",
        defaultValue: true,
      },
      isDrawingPose: {
        type: "checkbox",
        label: "Draw Human Body Recognition",
        defaultValue: true,
      },
      mediapipeModel: {
        type: "select",
        label: "Pose Model",
        options: ["full", "light"],
        defaultValue: "full",
      },
      hideMusicIcon: {
        type: "checkbox",
        label: "Hide Music Icon",
        defaultValue: false,
      },
      shouldShowCameraSelector: {
        type: "checkbox",
        label: "Show Camera Selector",
        defaultValue: false,
      },
      landmarkColor: {
        type: "text",
        label: "Landmark Color (hex, e.g., #14FF00)",
        defaultValue: "",
      },
      // includePoseData: { type: "checkbox-group", label: "Include Pose Data", options: ["angles", "poseLandmarks", "worldLandmarks"], defaultValue: [] }, // Advanced, can impact performance
      hideMistakesFeedback: {
        type: "checkbox",
        label: "Hide Mistakes Feedback",
        defaultValue: false,
      },
      resetPlanProgress: {
        type: "checkbox",
        label: "Reset Plan Progress",
        defaultValue: false,
      },
      shouldAskCamera: {
        type: "checkbox",
        label: "Ask Camera Permission (App Level)",
        defaultValue: true,
      },
      language: {
        type: "text",
        label: "Language (e.g., en, es)",
        defaultValue: "en",
      },
    },
    postDataMap: (input, additional) => ({
      currentExercise: input,
      exercises: additional.exercises.split(",").map((e) => e.trim()),
      customParams: {
        includeRealtimeAccuracy: additional.includeRealtimeAccuracy,
        isDrawingPose: additional.isDrawingPose,
        mediapipeModel: additional.mediapipeModel,
        hideMusicIcon: additional.hideMusicIcon,
        shouldShowCameraSelector: additional.shouldShowCameraSelector,
        landmarkColor: additional.landmarkColor || undefined,
        hideMistakesFeedback: additional.hideMistakesFeedback,
        resetPlanProgress: additional.resetPlanProgress,
        shouldAskCamera: additional.shouldAskCamera,
        language: additional.language,
        // includePoseData: additional.includePoseData.length > 0 ? additional.includePoseData : undefined,
      },
    }),
  },
};

export default function KinesteXPlayer() {
  const iframeRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState("EXPERIENCE"); // Default to your 'assessment' experience
  const [mainInput, setMainInput] = useState(
    INTEGRATION_OPTIONS.MAIN.defaultInput
  ); // For MAIN category
  const [planWorkoutExperienceInput, setPlanWorkoutExperienceInput] = useState(
    INTEGRATION_OPTIONS.EXPERIENCE.defaultInput
  ); // For PLAN, WORKOUT, EXPERIENCE
  const [challengeInput, setChallengeInput] = useState(
    INTEGRATION_OPTIONS.CHALLENGE.defaultInput
  ); // For CHALLENGE
  const [leaderboardInput, setLeaderboardInput] = useState(
    INTEGRATION_OPTIONS.LEADERBOARD.defaultInput
  ); // For LEADERBOARD
  const [cameraInput, setCameraInput] = useState(
    INTEGRATION_OPTIONS.CAMERA.defaultInput
  ); // For CAMERA

  // State for additional inputs (e.g., challenge countdown, camera exercises)
  const [additionalInputs, setAdditionalInputs] = useState(() => {
    const initialState = {};
    Object.values(INTEGRATION_OPTIONS).forEach((option) => {
      if (option.additionalInputs) {
        Object.entries(option.additionalInputs).forEach(([key, prop]) => {
          initialState[key] = prop.defaultValue;
        });
      }
    });
    return initialState;
  });

  // Replace with your actual KinesteX credentials
  const KINESTEX_API_KEY = "de749805ddb1a1c2011823eaa56d1853";
  const KINESTEX_USER_ID = "userid";
  const KINESTEX_COMPANY_NAME = "Serdar Kinestex Test";

  // Base URL for KinesteX web application
  const KINESTEX_BASE_URL = "https://kinestex.vercel.app";

  // Function to get the current input value based on selected integration
  const getCurrentInput = useCallback(() => {
    switch (selectedIntegration) {
      case "MAIN":
        return mainInput;
      case "PLAN":
      case "WORKOUT":
      case "EXPERIENCE":
        return planWorkoutExperienceInput;
      case "CHALLENGE":
        return challengeInput;
      case "LEADERBOARD":
        return leaderboardInput;
      case "CAMERA":
        return cameraInput;
      default:
        return "";
    }
  }, [
    selectedIntegration,
    mainInput,
    planWorkoutExperienceInput,
    challengeInput,
    leaderboardInput,
    cameraInput,
  ]);

  // Function to determine the correct srcURL based on selected integration
  const getSrcURL = useCallback(() => {
    const option = INTEGRATION_OPTIONS[selectedIntegration];
    let url = `${KINESTEX_BASE_URL}${option.path}`;

    if (option.urlParam) {
      url += getCurrentInput();
    }
    if (option.urlQueryParam) {
      const query = option.urlQueryParam(KINESTEX_USER_ID);
      url += (url.includes("?") ? "&" : "?") + query;
    }
    return url;
  }, [selectedIntegration, getCurrentInput, KINESTEX_USER_ID]);

  // Function to prepare postData based on selected integration
  const getPostData = useCallback(() => {
    let data = {
      userId: KINESTEX_USER_ID,
      company: KINESTEX_COMPANY_NAME,
      key: KINESTEX_API_KEY,
      style: "dark", // Default style
      // Optional user details (uncomment if you want to send them)
      // age: 25,
      // height: 170,
      // weight: 60,
      // gender: "Female",
    };

    const option = INTEGRATION_OPTIONS[selectedIntegration];
    if (option.postDataMap) {
      Object.assign(
        data,
        option.postDataMap(getCurrentInput(), additionalInputs)
      );
    }

    return data;
  }, [
    selectedIntegration,
    getCurrentInput,
    additionalInputs,
    KINESTEX_API_KEY,
    KINESTEX_USER_ID,
    KINESTEX_COMPANY_NAME,
  ]);

  // Function to send the data to the iframe
  const sendMessage = useCallback(() => {
    const currentPostData = getPostData();
    const currentSrcURL = getSrcURL();

    if (iframeRef.current?.contentWindow) {
      console.log(
        "Sending message to KinesteX:",
        currentPostData,
        "to URL:",
        currentSrcURL
      );
      iframeRef.current.contentWindow.postMessage(
        currentPostData,
        currentSrcURL
      );
    } else {
      setTimeout(() => {
        try {
          iframeRef.current?.contentWindow?.postMessage(
            currentPostData,
            currentSrcURL
          );
        } catch (e) {
          console.error("Failed to send message on retry:", e);
        }
      }, 100);
    }
  }, [getPostData, getSrcURL]);

  useEffect(() => {
    const handleMessage = (event) => {

      try {
        const message = JSON.parse(event.data);
        console.log(
          "Received message from KinesteX:",
          message.type,
          message.data
        );

        switch (message.type) {
          case "kinestex_loaded":
            sendMessage(); // Re-send initial data when KinesteX DOM is ready
            break;
          case "exit_kinestex":
            setVisible(false);
            console.log('exit kinestex')
            if (iframeRef.current) {
              iframeRef.current.src = "about:blank"; // Clear iframe src to stop processes
            }
            break;
          // --- Common Data Points ---
          case "exercise_completed":
          case "plan_unlocked":
          case "workout_opened":
          case "workout_started":
          case "error_occurred":
          case "left_camera_frame":
          case "returned_camera_frame":
          case "workout_overview":
          case "exercise_overview":
          case "workout_completed":
            // Log these common messages
            break;
          // --- Camera Component Specific Data Points ---
          case "reps":
          case "mistake":
          case "successful_repeat":
            // Handle camera-specific feedback
            break;
          case "custom_type": // Handles messages like 'model_warmedup', 'models_loaded', 'correct_position_accuracy', 'stop_camera'
            console.log(
              "Custom type message:",
              message.data.type,
              message.data
            );
            if (message.data.type === "stop_camera") {
              // Perform any cleanup or UI updates when camera stops
            }
            break;
          default:
            console.log("Unhandled KinesteX message:", message);
        }
      } catch (err) {
        console.error("Failed to parse message from KinesteX:", err);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [sendMessage, getSrcURL]); // Dependencies for useEffect

  // Function to update current exercise for CAMERA component after it's loaded
  const updateCameraExercise = () => {
    const currentSrcURL = getSrcURL();
    const newExercise = additionalInputs.switchExercise;
    if (iframeRef.current?.contentWindow && newExercise) {
      console.log("Updating camera exercise to:", newExercise);
      iframeRef.current.contentWindow.postMessage(
        { currentExercise: newExercise },
        currentSrcURL
      );
    } else {
      console.warn(
        "Cannot switch exercise: Camera component not visible or no exercise provided."
      );
    }
  };

  const currentOption = INTEGRATION_OPTIONS[selectedIntegration];

  const handleInputChange = (e) => {
    switch (selectedIntegration) {
      case "MAIN":
        setMainInput(e.target.value);
        break;
      case "PLAN":
      case "WORKOUT":
      case "EXPERIENCE":
        setPlanWorkoutExperienceInput(e.target.value);
        break;
      case "CHALLENGE":
        setChallengeInput(e.target.value);
        break;
      case "LEADERBOARD":
        setLeaderboardInput(e.target.value);
        break;
      case "CAMERA":
        setCameraInput(e.target.value);
        break;
      default:
        break;
    }
  };

  const handleAdditionalInputChange = (key, value) => {
    setAdditionalInputs((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div
      style={{
        padding: "20px",
        maxWidth: "900px",
        margin: "auto",
        textAlign: "center",
        backgroundColor: "#fff",
        borderRadius: "8px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
      }}
    >
      <h1 style={{ color: "#333" }}>KinesteX Web Integration Demo</h1>

      <div
        style={{
          marginBottom: "20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <label
          htmlFor="integration-select"
          style={{ marginRight: "10px", fontWeight: "bold", fontSize: "1.1em" }}
        >
          Select Integration:
        </label>
        <select
          id="integration-select"
          value={selectedIntegration}
          onChange={(e) => {
            setSelectedIntegration(e.target.value);
            // Reset main input based on new selection's default
            const newOption = INTEGRATION_OPTIONS[e.target.value];
            switch (e.target.value) {
              case "MAIN":
                setMainInput(newOption.defaultInput);
                break;
              case "PLAN":
              case "WORKOUT":
              case "EXPERIENCE":
                setPlanWorkoutExperienceInput(newOption.defaultInput);
                break;
              case "CHALLENGE":
                setChallengeInput(newOption.defaultInput);
                break;
              case "LEADERBOARD":
                setLeaderboardInput(newOption.defaultInput);
                break;
              case "CAMERA":
                setCameraInput(newOption.defaultInput);
                break;
              default:
                break;
            }
            // Reset additional inputs to their defaults for the new selection
            setAdditionalInputs({});
            if (newOption.additionalInputs) {
              const newAdditionalState = {};
              Object.entries(newOption.additionalInputs).forEach(
                ([key, prop]) => {
                  newAdditionalState[key] = prop.defaultValue;
                }
              );
              setAdditionalInputs(newAdditionalState);
            }
          }}
          style={{
            padding: "10px",
            borderRadius: "5px",
            border: "1px solid #ccc",
            minWidth: "250px",
          }}
        >
          {Object.entries(INTEGRATION_OPTIONS).map(([key, option]) => (
            <option key={key} value={key}>
              {option.name}
            </option>
          ))}
        </select>
      </div>

      {currentOption.input && (
        <div style={{ marginBottom: "20px" }}>
          <label
            htmlFor="main-input"
            style={{ marginRight: "10px", fontWeight: "bold" }}
          >
            {currentOption.input.label}:
          </label>
          {currentOption.input.type === "text" && (
            <input
              id="main-input"
              type="text"
              value={getCurrentInput()}
              onChange={handleInputChange}
              placeholder={currentOption.input.placeholder}
              style={{
                padding: "8px",
                borderRadius: "5px",
                border: "1px solid #ccc",
                width: "300px",
              }}
            />
          )}
          {currentOption.input.type === "select" && (
            <select
              id="main-input"
              value={getCurrentInput()}
              onChange={handleInputChange}
              style={{
                padding: "8px",
                borderRadius: "5px",
                border: "1px solid #ccc",
                width: "300px",
              }}
            >
              {currentOption.input.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {currentOption.additionalInputs && (
        <div
          style={{
            marginBottom: "20px",
            border: "1px solid #eee",
            padding: "15px",
            borderRadius: "8px",
            backgroundColor: "#f9f9f9",
          }}
        >
          <h3 style={{ marginTop: "0", color: "#555" }}>
            Additional Parameters:
          </h3>
          {Object.entries(currentOption.additionalInputs).map(([key, prop]) => (
            <div
              key={key}
              style={{
                marginBottom: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <label
                htmlFor={key}
                style={{
                  marginRight: "10px",
                  fontWeight: "bold",
                  minWidth: "180px",
                  textAlign: "right",
                }}
              >
                {prop.label}:
              </label>
              {prop.type === "text" && (
                <input
                  id={key}
                  type="text"
                  value={additionalInputs[key] || ""}
                  onChange={(e) =>
                    handleAdditionalInputChange(key, e.target.value)
                  }
                  placeholder={prop.placeholder || prop.defaultValue}
                  style={{
                    padding: "8px",
                    borderRadius: "5px",
                    border: "1px solid #ccc",
                    width: "250px",
                  }}
                />
              )}
              {prop.type === "number" && (
                <input
                  id={key}
                  type="number"
                  value={additionalInputs[key] || ""}
                  onChange={(e) =>
                    handleAdditionalInputChange(key, Number(e.target.value))
                  }
                  min="1"
                  style={{
                    padding: "8px",
                    borderRadius: "5px",
                    border: "1px solid #ccc",
                    width: "100px",
                  }}
                />
              )}
              {prop.type === "checkbox" && (
                <input
                  id={key}
                  type="checkbox"
                  checked={!!additionalInputs[key]}
                  onChange={(e) =>
                    handleAdditionalInputChange(key, e.target.checked)
                  }
                  style={{ width: "20px", height: "20px" }}
                />
              )}
              {prop.type === "select" && (
                <select
                  id={key}
                  value={additionalInputs[key] || ""}
                  onChange={(e) =>
                    handleAdditionalInputChange(key, e.target.value)
                  }
                  style={{
                    padding: "8px",
                    borderRadius: "5px",
                    border: "1px solid #ccc",
                    width: "150px",
                  }}
                >
                  {prop.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}
              {/* Add checkbox-group for includePoseData if needed, as it's more complex UI */}
            </div>
          ))}

          {selectedIntegration === "CAMERA" && (
            <div
              style={{
                marginTop: "15px",
                paddingTop: "15px",
                borderTop: "1px dashed #ccc",
              }}
            >
              <h4 style={{ margin: "0 0 10px 0", color: "#666" }}>
                Camera Live Controls:
              </h4>
              <button
                onClick={updateCameraExercise}
                disabled={
                  !visible ||
                  selectedIntegration !== "CAMERA" ||
                  !additionalInputs.switchExercise
                }
                style={{
                  padding: "8px 15px",
                  fontSize: "14px",
                  backgroundColor: "#007bff",
                  color: "white",
                  borderRadius: "5px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Switch Exercise to "{additionalInputs.switchExercise || "N/A"}"
              </button>
              <p
                style={{ fontSize: "0.8em", color: "#666", marginTop: "10px" }}
              >
                You can also use "Pause Exercise", "Pause Audio", "Resume Audio"
                as exercise names to control the camera component.
              </p>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setVisible((prev) => !prev)}
        style={{
          backgroundColor: visible ? "#dc3545" : "#28a745",
          fontSize: "20px",
          padding: "15px 30px",
        }}
      >
        {visible ? "Close KinesteX" : `Open KinesteX ${currentOption.name}`}
      </button>

      {visible && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999 }}>
          <iframe
            ref={iframeRef}
            src={getSrcURL()} // Dynamically set srcURL
            frameBorder="0"
            allow="camera; microphone; autoplay; accelerometer; gyroscope; magnetometer"
            sandbox="allow-same-origin allow-scripts"
            allowFullScreen
            style={{ width: "100%", height: "100%" }}
            onLoad={sendMessage} // Send initial data when the iframe content loads
          />
        </div>
      )}
    </div>
  );
}
