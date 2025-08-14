import React,{useState,useEffect} from 'react'
import toast from 'react-hot-toast'
import {Text,Flex,Box,Skeleton, SkeletonCircle} from '@chakra-ui/react'
import SuggestedUser from './SuggestedUser'
import axios from 'axios'
const SuggestedUsers = () => {
    const [loading, setLoading] = useState(false);
    const [suggestedUsers, setSuggestedUsers] = useState([]);
    useEffect(()=>{
        const getSuggestUsers = async()=>{
            setLoading(true);
                    try{
                    const response = await axios.get('/api/v1/users/suggested');
                setSuggestedUsers(response.data.users);
                console.log(response.data.users);
                }
           
            catch (error){
                toast.error("Failed to fetch suggested users")
            }
            finally{
                setLoading(false);
            }
        }
            getSuggestUsers();
    },[])


  return (
    <>
    <Text mb={4} fontWeight={"bold"}>
				Suggested Users
			</Text>
			<Flex direction={"column"} gap={4}>
				{!loading && suggestedUsers.map((user) => <SuggestedUser key={user._id} user={user} />)}
				{loading &&
					[0, 1, 2, 3, 4].map((_, idx) => (
						<Flex key={idx} gap={2} alignItems={"center"} p={"1"} borderRadius={"md"}>
							{/* avatar skeleton */}
							<Box>
								<SkeletonCircle size={"10"} />
							</Box>
							{/* username and fullname skeleton */}
							<Flex w={"full"} flexDirection={"column"} gap={2}>
								<Skeleton h={"8px"} w={"80px"} />
								<Skeleton h={"8px"} w={"90px"} />
							</Flex>
							{/* follow button skeleton */}
							<Flex>
								<Skeleton h={"20px"} w={"60px"} />
							</Flex>
						</Flex>
					))}
			</Flex>
    </>
  )
}

export default SuggestedUsers