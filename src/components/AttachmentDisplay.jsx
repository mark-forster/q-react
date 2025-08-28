import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Flex,
  Box,
  Text,
  Button,
  Image,
  Skeleton,
  useColorModeValue,
  useToast,
  IconButton,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
} from "@chakra-ui/react";
import { FaPlay, FaPause, FaFileDownload } from "react-icons/fa";
import axios from "axios";
import { useRecoilState } from "recoil";
import { currentlyPlayingAudioIdAtom } from "../atoms/messageAtom";

// ---------- API ----------
const API_BASE = import.meta.env.VITE_API_URL || "";
const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
  withCredentials: true,
});

// ---------- Small in-memory cache for signed URLs ----------
const signedUrlCache = new Map(); // key -> { url, ts }
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function cacheGet(key) {
  const v = signedUrlCache.get(key);
  if (!v) return null;
  if (Date.now() - v.ts > CACHE_TTL_MS) {
    signedUrlCache.delete(key);
    return null;
  }
  return v.url;
}
function cacheSet(key, url) {
  signedUrlCache.set(key, { url, ts: Date.now() });
}

function pickPlayableAudioFormat(att) {
  const a = document.createElement("audio");
  const orig = att?.format || (att?.mimeType ? att.mimeType.split("/")[1] : "");

  if (orig) {
    const testMime =
      orig === "webm" ? 'audio/webm; codecs="opus"' :
      orig === "ogg"  ? 'audio/ogg; codecs="opus"' :
                        `audio/${orig}`;
    if (a.canPlayType(testMime)) return { format: orig, forceMp3: false };
  }
  if (a.canPlayType('audio/webm; codecs="opus"')) return { format: "webm", forceMp3: false };
  if (a.canPlayType('audio/ogg; codecs="opus"'))  return { format: "ogg",  forceMp3: false };
  if (a.canPlayType("audio/wav"))                 return { format: "wav",  forceMp3: false };
  return { format: "mp3", forceMp3: true };
}

const formatTime = (secs) => {
  if (!isFinite(secs) || secs < 0) secs = 0;
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
};

function buildCacheKey(att, params) {
  const pid = att?.public_id || att?.publicId || "no_public";
  const t = att?.type || "unknown";
  const fmt = att?.format || "none";
  const extra = params ? JSON.stringify(params) : "";
  return `${pid}::${t}::${fmt}::${extra}`;
}

const AttachmentDisplay = ({ attachment, imgLoaded, setImgLoaded, messageId }) => {
  const toast = useToast();
  const [fileUrl, setFileUrl] = useState(null);
  const [imgLoading, setImgLoading] = useState(true);

  // audio controls (one-at-a-time)
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);
  const [currentlyPlayingAudioId, setCurrentlyPlayingAudioId] = useRecoilState(currentlyPlayingAudioIdAtom);

  // ------- Stable derived values (to avoid effect ) -------
  const attType   = attachment?.type;
  const attPid    = attachment?.public_id || attachment?.publicId || null;
  const attFormat = attachment?.format;
  const directUrl = attachment?.url || null;

  // ------- Fetch (or reuse) a signed URL only when necessary -------
  useEffect(() => {
    let abort = false;

    async function run() {
      // If direct URL is available for viewable types, use it directly
      if ((attType === "image" || attType === "gif" || attType === "video") && directUrl) {
        if (!abort) setFileUrl((prev) => (prev !== directUrl ? directUrl : prev));
        return;
      }

      // If no public_id, fallback to whatever url is present (or null)
      if (!attPid) {
        if (!abort) setFileUrl((prev) => (prev !== directUrl ? directUrl : prev));
        return;
      }

      // Build API params by type
      let params = null;
      if (attType === "audio") {
        const { format, forceMp3 } = pickPlayableAudioFormat(attachment);
        params = forceMp3
          ? { resourceType: "video", forceMp3: "true" }
          : { resourceType: "video", format };
      } else if (attType === "video") {
        params = { resourceType: "video", format: attFormat || "mp4" };
      } else if (attType === "file") {
        params = { resourceType: "raw", format: attFormat || "bin" };
      } else if (attType === "image" || attType === "gif") {
        params = { resourceType: "image", format: attFormat || undefined };
      } else {
        // unknown type → try raw
        params = { resourceType: "raw", format: attFormat || "bin" };
      }

      const cacheKey = buildCacheKey(attachment, params);
      const cached = cacheGet(cacheKey);
      if (cached) {
        if (!abort) setFileUrl((prev) => (prev !== cached ? cached : prev));
        return;
      }

      try {
        const { data } = await api.get(`/messages/get-signed-url/${attPid}`, { params });
        if (abort) return;
        if (data?.url) {
          cacheSet(cacheKey, data.url);
          setFileUrl((prev) => (prev !== data.url ? data.url : prev));
        } else {
          setFileUrl((prev) => (prev !== directUrl ? directUrl : prev));
        }
      } catch (error) {
        if (abort) return;
        console.error("Error fetching signed URL:", error);
        toast({
          title: "Error while uploading file",
          description: "URL not found or  expired",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        setFileUrl((prev) => (prev !== directUrl ? directUrl : prev));
      }
    }

    run();
    return () => { abort = true; };
  }, [attType, attPid, attFormat, directUrl, toast, attachment]); //
  // ------- Ensure only one audio plays at a time -------
  useEffect(() => {
    if (currentlyPlayingAudioId !== messageId && audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [currentlyPlayingAudioId, messageId, isPlaying]);

  useEffect(() => {
    return () => {
      // component unmount - pause to avoid leaking audio
      if (audioRef.current) {
        try { audioRef.current.pause(); } catch {}
      }
    };
  }, []);

  const handlePlayPause = async () => {
    if (!audioRef.current) return;
    try {
      if (isPlaying) {
        audioRef.current.pause();
        setCurrentlyPlayingAudioId(null);
        setIsPlaying(false);
      } else {
        const playPromise = audioRef.current.play();
        if (playPromise && typeof playPromise.then === "function") {
          await playPromise;
        }
        setCurrentlyPlayingAudioId(messageId);
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("Audio play error:", err);
      toast({
        title: "Audio ",
        description: " autoplay policy/codec",
        status: "warning",
        duration: 4000,
        isClosable: true,
      });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime || 0);
  };
  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration || 0);
  };
  const handleSliderChange = (value) => {
    if (audioRef.current && isFinite(audioRef.current.duration)) {
      audioRef.current.currentTime = value;
      setCurrentTime(value);
    }
  };
  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentlyPlayingAudioId(null);
  };

  // ----------- RENDER -----------
  switch (attType) {
    case "image":
    case "gif":
      return (
        <Box mt={1} w={"220px"} position="relative">
          {fileUrl ? (
            <Image
              src={fileUrl}
              alt="Message image"
              borderRadius={4}
              onLoad={() => {
                setImgLoaded?.(true);
                setImgLoading(false);
              }}
              onError={() => setImgLoading(false)}
              style={{ display: "block", cursor: fileUrl ? "pointer" : "default" }}
              onClick={() => fileUrl && window.open(fileUrl, "_blank", "noopener,noreferrer")}
            />
          ) : (
            <Skeleton height="160px" width="100%" borderRadius="4px" />
          )}
        </Box>
      );

    case "video":
      return (
        <Box mt={1} w={"240px"} position="relative">
          {fileUrl ? (
            <video
              controls
              preload="metadata"
              src={fileUrl}
              style={{ width: "100%", borderRadius: "4px" }}
            />
          ) : (
            <Skeleton height="160px" width="100%" borderRadius="4px" />
          )}
        </Box>
      );

    case "audio": {
      const canUse = duration && isFinite(duration);
      return (
        <Flex
          mt={1}
          bg={useColorModeValue("gray.200", "gray.700")}
          borderRadius="full"
          p={2}
          w={"260px"}
          alignItems="center"
          justifyContent="space-between"
        >
          {fileUrl ? (
            <>
              <IconButton
                icon={isPlaying ? <FaPause /> : <FaPlay />}
                aria-label={isPlaying ? "Pause audio" : "Play audio"}
                size="sm"
                borderRadius="full"
                colorScheme="blue"
                onClick={handlePlayPause}
                isDisabled={!canUse}
              />
              <Box flex="1" mx={2}>
                <Slider
                  aria-label="audio-progress"
                  value={currentTime}
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  onChange={handleSliderChange}
                  isDisabled={!canUse}
                >
                  <SliderTrack bg={useColorModeValue("blue.100", "blue.900")}>
                    <SliderFilledTrack bg="blue.500" />
                  </SliderTrack>
                  <SliderThumb boxSize={2} />
                </Slider>
              </Box>
              <Text fontSize="xs" color={useColorModeValue("gray.500", "gray.400")} ml={2}>
                {formatTime((duration || 0) - (currentTime || 0))}
              </Text>

              {/* hidden audio element */}
              <audio
                ref={audioRef}
                src={fileUrl}
                preload="metadata"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleAudioEnded}
                onError={() => {
                  setIsPlaying(false);
                  setCurrentlyPlayingAudioId(null);
                  toast({
                    title: "Audio",
                    status: "error",
                    duration: 3000,
                    isClosable: true,
                  });
                }}
              />
            </>
          ) : (
            <Skeleton height="32px" width="100%" borderRadius="4px" />
          )}
        </Flex>
      );
    }

    case "file":
      return (
        <Flex
          alignItems="center"
          p={2}
          bg={useColorModeValue("gray.100", "gray.700")}
          borderRadius="md"
          mt={1}
        >
          <Text
            fontSize="sm"
            isTruncated
            maxW={"180px"}
            cursor={fileUrl ? "pointer" : "default"}
            color="blue.500"
            textDecoration="underline"
            onClick={() => fileUrl && window.open(fileUrl, "_blank", "noopener,noreferrer")}
          >
            {attachment?.name || "Download"}
          </Text>
          <Button
            size="xs"
            ml={2}
            onClick={() => fileUrl && window.open(fileUrl, "_blank", "noopener,noreferrer")}
            isDisabled={!fileUrl}
            leftIcon={<FaFileDownload />}
          >
            Download
          </Button>
        </Flex>
      );

    default:
      return null;
  }
};

export default React.memo(AttachmentDisplay);
