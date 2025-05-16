import useAppStore from "../state-utils/state-management";

export const updateLastSteps = async (steps: any) => {
  console.log("updating last steps", steps);
  // const {setLastAiSteps } = useAppStore();
  // setLastAiSteps(steps);
  // const store = useAppStore.getState();
  // store.setLastAiSteps(steps);
};
export const getMimeTypeFromImagePath = async (
  imagePath: string,
): Promise<string | null> => {
  if (!imagePath || typeof imagePath !== "string") {
    throw new Error("Invalid image path");
  }

  const extension = imagePath.split(".").pop()?.toLowerCase();

  if (!extension) {
    return null; // Return null if no extension is found
  }

  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    bmp: "image/bmp",
    svg: "image/svg+xml",
  };

  return mimeTypes[extension] || null; // Return null if the extension is not in the list
};
