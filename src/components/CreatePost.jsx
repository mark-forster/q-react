import { useState, useRef } from "react";
import { MdAddCircle } from "react-icons/md";
import { BsFillImageFill } from "react-icons/bs";
import axios from "axios";
import {
  Button,
  useColorModeValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  Text,
  Flex,
  CloseButton,
  Image,
  Input,
  Textarea,
} from "@chakra-ui/react";
import usePreviewImg from "../hooks/usePreviewImg";
import { useRecoilState, useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import toast from "react-hot-toast";
import postsAtom from "../atoms/postAtom";
import { useParams } from "react-router-dom";
const CreatePost = () => {
  const [posts, setPosts] = useRecoilState(postsAtom);
  const MAX_CHAR = 500;
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [postText, setPostText] = useState("");
  const fileRef = useRef(null);
  const { handleImageChange, imgUrl, setImgUrl } = usePreviewImg();

  // handle text changing
  const [remainingChar, setRemainingChar] = useState(MAX_CHAR);
  // getting current User
  const user = useRecoilValue(userAtom);
  const username = useParams();
  const handleTextChange = async (e) => {
    const inputText = e.target.value;
    // validating input Text length
    if (inputText.length > MAX_CHAR) {
      const turncatedText = inputText.slice(0, MAX_CHAR);
      setPostText(turncatedText);
      setRemainingChar(0);
    } else {
      setPostText(inputText);
      setRemainingChar(MAX_CHAR - inputText.length);
    }
  };

  // handling creating post
  const handleCreatePost = async () => {
    try {
      const response = await axios.post("/api/v1/posts/create", {
        postedBy: user._id,
        text: postText,
        img: imgUrl,
      });
      if (response.data.errorMessage) {
        toast.error(response.data.errorMessage);
        return 0;
      }
      toast.success(response.data.message);
      setPostText("");
      onClose();
      if (username.username == user.username) {
        setPosts([response.data.post, ...posts]);
      }
      setImgUrl("");
    } catch (error) {
      toast.error(error);
    }
  };

  return (
    <>
      <Button
        position={"fixed"}
        bottom={10}
        right={5}
        bg={useColorModeValue("gray.400", "gray.dark")}
        onClick={onOpen}
        size={{ base: "sm", sm: "md" }}
      >
        <MdAddCircle />
        Post
      </Button>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Post</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl>
              <Textarea
                placeholder="Post content here......"
                onChange={handleTextChange}
              />
              <Text
                fontSize="xs"
                fontWeight="bold"
                textAlign={"right"}
                m={1}
                color={"gray.80"}
              >
                {remainingChar}/{MAX_CHAR}
              </Text>
              <Input
                type="file"
                hidden
                ref={fileRef}
                onChange={handleImageChange}
              />

              <BsFillImageFill
                style={{ marginLeft: "5px", cursor: "pointer" }}
                size={16}
                onClick={() => fileRef.current.click()}
              />
            </FormControl>
            {imgUrl && (
              <Flex mt={5} w={"full"} position={"relative"}>
                <Image src={imgUrl} alt="Selected img" />
                <CloseButton
                  onClick={() => {
                    setImgUrl("");
                  }}
                  bg={"gray.800"}
                  position={"absolute"}
                  top={2}
                  right={2}
                />
              </Flex>
            )}
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={handleCreatePost}>
              Post
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default CreatePost;
