import React, { useEffect, useRef, useState } from "react";
import {
  Flex,
  Box,
  Text,
  Button,
  Image,
  Skeleton,
  useColorModeValue,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  IconButton,
} from "@chakra-ui/react";
import { FaPlay, FaPause, FaFileDownload } from "react-icons/fa";
import axios from "axios";
import { useRecoilState } from "recoil";
import { currentlyPlayingAudioIdAtom } from "../atoms/messageAtom";

const API_BASE = import.meta.env.VITE_API_URL || "";
const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
  withCredentials: true,
});

// cache
const signedUrlCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;
const ERROR_CACHE_TTL_MS = 2 * 60 * 1000;

function cacheGet(key) {
  const v = signedUrlCache.get(key);
  if (!v) return null;

  const ttl = v.error ? ERROR_CACHE_TTL_MS : CACHE_TTL_MS;
  if (Date.now() - v.ts > ttl) {
    signedUrlCache.delete(key);
    return null;
  }
  return v;
}

function cacheSet(key, data) {
  signedUrlCache.set(key, { ...data, ts: Date.now() });
}

function cacheSetError(key, error) {
  signedUrlCache.set(key, { error: true, errorMessage: error, ts: Date.now() });
}

function pickPlayableAudioFormat(att) {
  const a = document.createElement("audio");
  const orig = att?.format || (att?.mimeType ? att.mimeType.split("/")[1] : "");

  if (orig) {
    const testMime =
      orig === "webm" ? 'audio/webm; codecs="opus"' :
      orig === "ogg" ? 'audio/ogg; codecs="opus"' :
      `audio/${orig}`;
    if (a.canPlayType(testMime)) return { format: orig, forceMp3: false };
  }
  if (a.canPlayType('audio/webm; codecs="opus"')) return { format: "webm", forceMp3: false };
  if (a.canPlayType('audio/ogg; codecs="opus"')) return { format: "ogg", forceMp3: false };
  if (a.canPlayType("audio/wav")) return { format: "wav", forceMp3: false };
  return { format: "mp3", forceMp3: true };
}

const formatTime = (secs) => {
  if (!isFinite(secs) || secs < 0) secs = 0;
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

function buildCacheKey(att, params) {
  const pid = att?.public_id || att?.publicId || "no_public";
  const t = att?.type || "unknown";
  const fmt = att?.format || "none";
  const extra = params ? JSON.stringify(params) : "";
  return `${pid}::${t}::${fmt}::${extra}`;
}

const AttachmentDisplay = ({
  attachment,
  imgLoaded,
  setImgLoaded,
  messageId,
  isSender,
}) => {
  // base state
  const [fileUrl, setFileUrl] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [imgLoading, setImgLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // audio
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);
  const [currentlyPlayingAudioId, setCurrentlyPlayingAudioId] = useRecoilState(
    currentlyPlayingAudioIdAtom
  );

  // color hooks
  const audioBubbleBgOther = useColorModeValue("gray.200", "gray.700");
  const audioIconBgOther = useColorModeValue("gray.300", "gray.600");
  const audioIconColorOther = useColorModeValue("black", "white");
  const audioSliderTrackColorOther = useColorModeValue("gray.400", "gray.500");
  const audioTimeColorOther = useColorModeValue("gray.500", "gray.400");
  const fileBg = useColorModeValue("gray.100", "gray.700");
  const imageErrorBg = useColorModeValue("gray.100", "gray.700");
  const imageErrorText = useColorModeValue("gray.500", "gray.400");
  const audioHoverBgLight = useColorModeValue("gray.400", "gray.500");

  const attType = attachment?.type;
  const attPid = attachment?.public_id || attachment?.publicId || null;
  const attFormat = attachment?.format;
  const directUrl = attachment?.url || null;

  // signed url
  useEffect(() => {
    let abort = false;

    async function run() {
      if ((attType === "image" || attType === "gif" || attType === "video") && directUrl) {
        if (!abort) setFileUrl((prev) => (prev !== directUrl ? directUrl : prev));
        return;
      }
      if (!attPid) {
        if (!abort) setFileUrl((prev) => (prev !== directUrl ? directUrl : prev));
        return;
      }

      let params = null;
      if (attType === "audio") {
        const { format, forceMp3 } = pickPlayableAudioFormat(attachment);
        params = forceMp3
          ? { resourceType: "video", forceMp3: "true" }
          : { resourceType: "video", format };
      } else if (attType === "video") {
        params = { resourceType: "video", format: attFormat || "mp4" };
      } else if (attType === "file") {
        params = { resourceType: "raw", format: attFormat || "bin", filename: attachment?.name };
      } else if (attType === "image" || attType === "gif") {
        params = { resourceType: "image", format: attFormat || undefined };
      } else {
        params = { resourceType: "raw", format: attFormat || "bin" };
      }

      const cacheKey = buildCacheKey(attachment, params);
      const cached = cacheGet(cacheKey);
      if (cached) {
        if (!abort) {
          setFileUrl(cached.previewUrl || cached.url || cached);
          setDownloadUrl(cached.downloadUrl || cached.url || cached);
        }
        return;
      }

      try {
        const publicId = attPid.split("/").pop();
        const { data } = await api.get(`/messages/get-signed-url/${publicId}`, {
          params,
        });
        if (abort) return;

        if (data?.previewUrl && data?.downloadUrl) {
          cacheSet(cacheKey, data);
          setFileUrl(data.previewUrl);
          setDownloadUrl(data.downloadUrl);
        } else if (data?.url) {
          cacheSet(cacheKey, { url: data.url });
          setFileUrl(data.url);
          setDownloadUrl(data.url);
        } else {
          cacheSetError(cacheKey, "No URL returned from server");
          setFileUrl(directUrl);
          setDownloadUrl(directUrl);
        }
      } catch (error) {
        if (abort) return;
        console.error("Error fetching signed URL:", error);

        const errorMessage =
          error?.response?.data?.error || error?.message || "Unknown error";
        const cacheKey = buildCacheKey(attachment, params);
        cacheSetError(cacheKey, errorMessage);

        setFileUrl(directUrl);
        setDownloadUrl(directUrl);
      }
    }

    run();
    return () => {
      abort = true;
    };
  }, [attType, attPid, attFormat, directUrl, attachment]);

  // only one audio at a time
  useEffect(() => {
    if (
      currentlyPlayingAudioId !== messageId &&
      audioRef.current &&
      isPlaying
    ) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [currentlyPlayingAudioId, messageId, isPlaying]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        try {
          audioRef.current.pause();
        } catch {}
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

  // render by type
  switch (attType) {
    case "image":
    case "gif":
      return (
        <Box mt={1} w={"220px"} position="relative">
          {fileUrl && !imgError ? (
            <Image
              src={fileUrl}
              alt="Message image"
              borderRadius={4}
              onLoad={() => {
                setImgLoaded?.(true);
                setImgLoading(false);
                setImgError(false);
              }}
              onError={() => {
                setImgLoading(false);
                setImgError(true);
                if (retryCount < 3) {
                  setTimeout(() => {
                    setRetryCount((prev) => prev + 1);
                    setImgError(false);
                    setImgLoading(true);
                  }, 1000 * (retryCount + 1));
                }
              }}
              style={{ display: "block", cursor: fileUrl ? "pointer" : "default" }}
              onClick={() =>
                fileUrl && window.open(fileUrl, "_blank", "noopener,noreferrer")
              }
            />
          ) : imgError && retryCount >= 3 ? (
            <Flex
              height="160px"
              width="100%"
              borderRadius="4px"
              bg={imageErrorBg}
              alignItems="center"
              justifyContent="center"
              flexDirection="column"
            >
              <Text fontSize="sm" color={imageErrorText}>
                Failed to load image
              </Text>
              <Button
                size="xs"
                mt={2}
                onClick={() => {
                  setRetryCount(0);
                  setImgError(false);
                  setImgLoading(true);
                }}
              >
                Retry
              </Button>
            </Flex>
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
      const bubbleBg = isSender ? "blue.500" : audioBubbleBgOther;
      const iconBg = isSender ? "white" : audioIconBgOther;
      const iconColor = isSender ? "blue.500" : audioIconColorOther;
      const sliderTrackColor = isSender ? "whiteAlpha.500" : audioSliderTrackColorOther;
      const sliderColor = isSender ? "white" : audioIconColorOther;
      const timeColor = isSender ? "whiteAlpha.800" : audioTimeColorOther;
      const audioHoverBg = isSender ? "white" : audioHoverBgLight;

      const canUse = duration && isFinite(duration);

      return (
        <Flex
          mt={1}
          bg={bubbleBg}
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
                bg={iconBg}
                color={iconColor}
                _hover={{
                  bg: audioHoverBg,
                }}
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
                  <SliderTrack bg={sliderTrackColor}>
                    <SliderFilledTrack bg={sliderColor} />
                  </SliderTrack>
                  <SliderThumb boxSize={2} bg={sliderColor} />
                </Slider>
              </Box>
              <Text fontSize="xs" color={timeColor} ml={2}>
                {formatTime((duration || 0) - (currentTime || 0))}
              </Text>

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
          bg={fileBg}
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
            onClick={() =>
              downloadUrl && window.open(downloadUrl, "_blank", "noopener,noreferrer")
            }
          >
            {attachment?.name || "Download"}
          </Text>
          <Button
            size="xs"
            ml={2}
            onClick={() =>
              downloadUrl && window.open(downloadUrl, "_blank", "noopener,noreferrer")
            }
            isDisabled={!downloadUrl}
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
