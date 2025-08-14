import { useState, useEffect } from "react";
import UserHeader from "../components/UserHeader";
import UserPost from "../components/UserPost";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Flex, Spinner } from "@chakra-ui/react";
import Post from "../components/Post";
import useGetProfile from "../hooks/useGetProfile";
import { useRecoilState, useRecoilValue } from "recoil";
import postsAtom from "../atoms/postAtom";
import PageNotFound from "./PageNotFound";
import toast from "react-hot-toast";
function UserPage() {
  const [posts, setPosts] = useRecoilState(postsAtom);
  const { username } = useParams();
  const { user } = useGetProfile();
  const [fetchingPosts, setFetchingPosts] = useState(true);
  useEffect(() => {
    // get user post
    const getPosts = async () => {
      try {
        if (!user) return; 
        setFetchingPosts(true);
        const response = await axios.get(`/api/v1/posts/user/${username}`);
        if (response.data.errmessage) {
          setPosts([]);
          return null;
        } else {
          setPosts(response.data.posts);
        }
      } catch (err) {
        console.log(err);
        setPosts([]);
      } finally {
        setFetchingPosts(false);
      }
    };
    getPosts();
  }, [username, setPosts]);
  if (!user)
    return (
      <>
        <PageNotFound />
      </>
    );

  return (
    <>
      <UserHeader user={user} />
      {!fetchingPosts && posts?.length === 0 && <h1>User has no Posts</h1>}
      {fetchingPosts && (
        <Flex justifyContent={"center"} my={12}>
          <Spinner size={"xl"} />
        </Flex>
      )}
      {posts?.map((post) => (
        <Post key={post._id} post={post} postedBy={post.postedBy} />
      ))}
    </>
  );
}

export default UserPage;
