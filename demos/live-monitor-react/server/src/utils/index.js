const getRandomInt = () => {
  return Math.floor(Math.random() * 1000000000);
};

const getPullStreamUrl = (Protocol, Domain, Interface, SdkAppId, Identifier, UserId) => {
  return `${Protocol}${Domain}/${Interface}?sdkappid=${SdkAppId}&identifier=${Identifier}&usersig=${UserId}&random=${getRandomInt()}&contenttype=json`;
};

const updateAvatarUrl = (userId, response) => {
  if (!response.UserProfileItem || !Array.isArray(response.UserProfileItem)) {
    return '';
  }
  const userProfile = response.UserProfileItem.find(profile => profile['To_Account'] === userId);
  if (!userProfile.ProfileItem || !Array.isArray(userProfile.ProfileItem)) {
    return '';
  }
  const avatarProfile = userProfile.ProfileItem.find(profile => profile.Tag === 'Tag_Profile_IM_Image');
  return avatarProfile.Value || '';
};

module.exports = {
  getRandomInt,
  getPullStreamUrl,
  updateAvatarUrl,
};
