import React, { useEffect, useState, useRef } from "react";
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

const API_BASE = import.meta.env.VITE_API_URL || "";
const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api/v1` : "/api/v1",
  withCredentials: true,
});

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

const formatTime = (timeInSeconds) => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const AttachmentDisplay = ({ attachment, imgLoaded, setImgLoaded, messageId }) => {
  const toast = useToast();
  const [fileUrl, setFileUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);
  const [currentlyPlayingAudioId, setCurrentlyPlayingAudioId] = useRecoilState(currentlyPlayingAudioIdAtom);

  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (!attachment) return;

      try {
        if ((attachment.type === "image" || attachment.type === "gif" || attachment.type === "video") && attachment.url) {
          setFileUrl(attachment.url);
          return;
        }

        if (!attachment.public_id) {
          setFileUrl(attachment?.url || null);
          return;
        }

        if (attachment.type === "audio") {
          const { format, forceMp3 } = pickPlayableAudioFormat(attachment);
          const params = forceMp3
            ? { resourceType: "video", forceMp3: "true" }
            : { resourceType: "video", format };
          const { data } = await api.get(`/messages/get-signed-url/${attachment.public_id}`, { params });
          setFileUrl(data.url);
          return;
        }

        if (attachment.type === "video") {
          const { data } = await api.get(`/messages/get-signed-url/${attachment.public_id}`, {
            params: { resourceType: "video", format: attachment.format || "mp4" },
          });
          setFileUrl(data.url);
          return;
        }

        if (attachment.type === "file") {
          const { data } = await api.get(`/messages/get-signed-url/${attachment.public_id}`, {
            params: { resourceType: "raw", format: attachment.format || "bin" },
          });
          setFileUrl(data.url);
          return;
        }

        if (attachment.type === "image" || attachment.type === "gif") {
          const { data } = await api.get(`/messages/get-signed-url/${attachment.public_id}`, {
            params: { resourceType: "image", format: attachment.format || undefined },
          });
          setFileUrl(data.url);
        }
      } catch (error) {
        console.error("Error fetching signed URL:", error);
        toast({
          title: "Error loading file.",
          description: "Could not load the file. It may have expired.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    };

    fetchSignedUrl();
  }, [attachment, toast]);
  
  // This useEffect ensures only one audio plays at a time
  useEffect(() => {
    if (currentlyPlayingAudioId !== messageId && audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [currentlyPlayingAudioId, messageId]);


  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setCurrentlyPlayingAudioId(null);
      } else {
        audioRef.current.play();
        setCurrentlyPlayingAudioId(messageId);
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
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
  }

  switch (attachment.type) {
    case "image":
    case "gif":
      return (
        <Box mt={1} w={"220px"} position="relative">
          <Image
            src={fileUrl || attachment.url}
            alt="Message image"
            borderRadius={4}
            onLoad={() => setImgLoaded?.(true)}
            style={{ display: "block" }}
            cursor="pointer"
            onClick={() => (fileUrl || attachment.url) && window.open(fileUrl || attachment.url, "_blank")}
          />
        </Box>
      );

    case "video":
      return (
        <Box mt={1} w={"240px"} position="relative">
          {fileUrl ? (
            <video controls src={fileUrl} style={{ width: "100%", borderRadius: "4px" }} />
          ) : (
            <Skeleton height="160px" width="100%" borderRadius="4px" />
          )}
        </Box>
      );

    case "audio":
      const progressValue = duration > 0 ? (currentTime / duration) * 100 : 0;
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
                isDisabled={!duration || isNaN(duration)}
              />
              <Box flex="1" mx={2}>
                <Slider
                  aria-label="audio-progress"
                  value={currentTime}
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  onChange={handleSliderChange}
                  isDisabled={!duration || isNaN(duration)}
                >
                  <SliderTrack bg={useColorModeValue("blue.100", "blue.900")}>
                    <SliderFilledTrack bg="blue.500" />
                  </SliderTrack>
                  <SliderThumb boxSize={2} />
                </Slider>
              </Box>
              <Text fontSize="xs" color={useColorModeValue("gray.500", "gray.400")} ml={2}>
                {duration ? formatTime(duration - currentTime) : "00:00"}
              </Text>
              <audio
                ref={audioRef}
                src={fileUrl}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleAudioEnded}
              />
            </>
          ) : (
            <Skeleton height="32px" width="100%" borderRadius="4px" />
          )}
        </Flex>
      );

    case "file":
      return (
        <Flex alignItems="center" p={2} bg={useColorModeValue("gray.100", "gray.700")} borderRadius="md" mt={1}>
          <Text
            fontSize="sm"
            isTruncated
            maxW={"180px"}
            cursor="pointer"
            color="blue.500"
            textDecoration="underline"
            onClick={() => fileUrl && window.open(fileUrl, "_blank")}
          >
            {attachment.name || "Download"}
          </Text>
          <Button
            size="xs"
            ml={2}
            onClick={() => fileUrl && window.open(fileUrl, "_blank")}
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

export default AttachmentDisplay;