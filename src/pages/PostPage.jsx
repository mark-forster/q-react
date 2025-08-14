import React, { useEffect, useState } from "react";
import {
  Divider,
  Flex,
  Avatar,
  Image,
  Text,
  Box,
  Button,
} from "@chakra-ui/react";
import { AiFillDelete } from "react-icons/ai";
import Actions from "../components/Actions";
import useGetProfile from "../hooks/useGetProfile";
import { useNavigate, useParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import axios from "axios";
import userAtom from "../atoms/userAtom";
import { useRecoilState, useRecoilValue } from "recoil";
import Comment from "../components/Comment";
import postsAtom from "../atoms/postAtom";
// import Comment from '../components/Comment';
const PostPage = () => {
  const { user } = useGetProfile();
  const [posts, setPosts] = useRecoilState(postsAtom);
  const currentPost = posts[0];
  const currentUser = useRecoilValue(userAtom);
  const navigate = useNavigate();
  const { postId } = useParams();
  useEffect(() => {
    setPosts([]);
    const getPost = async () => {
      try {
        const response = await axios.get(`/api/v1/posts/${postId}`);
        setPosts([response.data.post]);
      } catch (error) {
        console.log(error);
      }
    };
    getPost();
  }, [postId, setPosts]);

  const handleDelete = async (e) => {
    e.preventDefault();
    if (!window.confirm("Are you sure you want to delete this post")) return;
    try {
      const response = await axios.delete(`/api/v1/posts/${currentPost._id}`);
      toast.success(response.data.message);
      navigate(`/${user.username}`);
    } catch (error) {
      console.error(error);
    }
  };

  if (!currentPost) return null;
  return (
    <>
      <Flex key={currentPost._id}>
        <Flex w={"full"} alignItems={"center"} gap={3}>
          <Avatar src={user?.profilePic} size={"md"} name="Lionel Messi" />
          <Flex>
            <Text fontSize={"sm"} fontWeight={"bold"}>
              {user?.username}
            </Text>
            <Image src="/verified.png" w="4" h={4} ml={4} />
          </Flex>
        </Flex>
        <Flex gap={4} alignItems={"center"}>
          <Text
            fontSize={"xs"}
            width={36}
            textAlign={"right"}
            color={"gray.light"}
          >
            {formatDistanceToNow(new Date(currentPost.createdAt))} ago
          </Text>
          {currentUser._id == user?._id && (
            <AiFillDelete size={20} onClick={handleDelete} />
          )}
        </Flex>
      </Flex>

      <Text my={3}>{currentPost.text}</Text>

      {currentPost.img && (
        <Box
          borderRadius={6}
          overflow={"hidden"}
          border={"1px solid"}
          borderColor={"gray.light"}
        >
          <Image src={currentPost.img} w={"full"} />
        </Box>
      )}

      <Flex gap={3} my={3}>
        <Actions key={currentPost._id} post={currentPost} />
      </Flex>
      <Divider my={4} />

      <Flex justifyContent={"space-between"}>
        <Flex gap={2} alignItems={"center"}>
          <Text fontSize={"2xl"}>👋</Text>
          <Text color={"gray.light"}>Get the app to like, reply and post.</Text>
        </Flex>
        <Button>Get</Button>
      </Flex>

      <Divider my={4} />
      {currentPost.replies.map((reply) => (
        <Comment
          key={reply._id}
          reply={reply}
          lastReply={
            reply._id ===
            currentPost.replies[currentPost.replies.length - 1]._id
          }
        />
      ))}
    </>
  );
};

export default PostPage;
