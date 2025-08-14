import React,{useState} from 'react'
import { useRecoilValue } from 'recoil';
import userAtom from '../atoms/userAtom';
import axios from 'axios'
import toast from 'react-hot-toast';
const useToggleFollowUnfollow = (user) => {
    const currentUser = useRecoilValue(userAtom);
	const [following, setFollowing] = useState(user.followers.includes(currentUser?._id));
	const [updating, setUpdating] = useState(false);
    const handleToggleFollow = async () => {
        if (!currentUser) {
          toast.error("Please login to follow");
          return;
        }
        if (updating) return;
    
        setUpdating(true);
    
        try {
          const result = await axios.post(`/api/v1/users/follow/${user._id}`);
          if (result.error) {
            toast.error(result.error.message);
            return 0;
          }
          if (following) {
            toast.success(`Unfollowed ${user.name} successfully`);
            user.followers.pop(); // simulate removing from followers
          } else {
            toast.success(`Followed ${user.name} successfully`);
            user.followers.push(currentUser?._id); // simulate adding to followers
          }
    
          setFollowing(!following);
        } catch (err) {
          console.log(err);
        } finally {
          setUpdating(false);
        }
      };
  return ({following,updating,handleToggleFollow})
}

export default useToggleFollowUnfollow