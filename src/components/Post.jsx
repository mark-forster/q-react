import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Flex, Avatar, Box, Text, Image } from "@chakra-ui/react";
import { AiFillDelete } from "react-icons/ai";
import Actions from "./Actions";
import { formatDistanceToNow } from "date-fns";
import axios from "axios";
import { useRecoilValue, useRecoilState } from "recoil";
import userAtom from "../atoms/userAtom";
import toast from "react-hot-toast";
import postsAtom from "../atoms/postAtom";
const Post = ({ post, postedBy }) => {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useRecoilState(postsAtom);
  const currentUser = useRecoilValue(userAtom);
  const navigate = useNavigate();
  useEffect(() => {
    const getUser = async () => {
      const response = await axios.get("/api/v1/users/profile/" + postedBy);
      const user = response.data.user;
      setUser(user);
    };
    getUser();
  }, [postedBy]);
  if (!user) return null;

  const handleDelete = async (e) => {
    e.preventDefault();
    if (!window.confirm("Are you sure you want to delete this post")) return;
    try {
      const response = await axios.delete(`/api/v1/posts/${post._id}`);
      toast.success(response.data.message);
      setPosts(posts.filter((p) => p._id !== post._id));
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      <Link to={`/${user.username}/posts/${post._id}`}>
        <Flex gap={3} mb={4} py={5}>
          <Flex
            flexDirection={"column"}
            columns={1}
            alignItems={"space-between"}
          >
            <Avatar
              size="md"
              name={user.name}
              src={user?.profilePic}
              onClick={(e) => {
                e.preventDefault();
                navigate(`/${user.username}`);
              }}
            />
            <Box w="1px" h={"full"} bg="gray.light" my={2}></Box>
            <Box position={"relative"} w={"full"}>
              {post.replies.length === 0 && (
                <Text textAlign={"center"}>🥱</Text>
              )}
              {post.replies[0] && (
                <Avatar
                  size="xs"
                  name="John doe"
                  src={post.replies[0].profilePic}
                  position={"absolute"}
                  top={"0px"}
                  left="15px"
                  padding={"2px"}
                />
              )}

              {post.replies[1] && (
                <Avatar
                  size="xs"
                  name="John doe"
                  src={post.replies[1].profilePic}
                  position={"absolute"}
                  bottom={"0px"}
                  right="-5px"
                  padding={"2px"}
                />
              )}

              {post.replies[2] && (
                <Avatar
                  size="xs"
                  name="John doe"
                  src={post.replies[2].profilePic}
                  position={"absolute"}
                  bottom={"0px"}
                  left="4px"
                  padding={"2px"}
                />
              )}
            </Box>
          </Flex>
          <Flex flex={1} flexDirection={"column"} gap={2}>
            <Flex justifyContent={"space-between"} w={"full"}>
              <Flex w={"full"} alignItems={"center"}>
                <Text
                  fontSize={"xs"}
                  fontWeight={"bold"}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/${user.username}`);
                  }}
                >
                  {user.username}
                </Text>
                <Image src="/verified.png" w={4} h={4} ml={1} />
              </Flex>
              <Flex gap={4} alignItems={"center"}>
                <Text
                  fontSize={"xs"}
                  width={36}
                  textAlign={"right"}
                  color={"gray.light"}
                >
                  {formatDistanceToNow(new Date(post.createdAt))} ago
                </Text>
                {currentUser?._id == user._id && (
                  <AiFillDelete size={20} onClick={handleDelete} />
                )}
              </Flex>
            </Flex>

            <Text fontSize={"sm"}>{post.text}</Text>

            <Box
              borderRadius={6}
              overflow={"hidden"}
              border={"1px solid"}
              borderColor={"gray.light"}
            >
              <Image src={post.img} w={"full"} />
            </Box>

            <Flex gap={3} my={1}>
              <Actions post={post} />
            </Flex>
          </Flex>
        </Flex>
      </Link>
    </>
  );
};

export default Post;
