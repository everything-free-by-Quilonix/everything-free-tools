import { compressImage } from "@/engines/image/compress";

import { exposeTask } from "./expose";

// The compressed Blob is structured-cloned back to the page; Blobs are passed by
// reference to the same underlying data, so no pixel buffer is copied.
exposeTask(compressImage);
