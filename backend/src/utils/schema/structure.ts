export const userAvatarSchema = {
  type: "file",
  label: "Avatar",
  name: "user.avatar",
  fileType: "image",
  width: 64,
  height: 64,
  maxSize: 1,
  className: "rounded-full",
  placeholder: "/img/avatars/placeholder.webp",
};

export const userFullNameSchema = {
  type: "input",
  component: "InfoBlock",
  label: "User",
  name: "user.firstName,' ',user.lastName",
  icon: "ph:user-circle-light",
};

export const imageStructure = {
  type: "file",
  label: "Image",
  name: "image",
  fileType: "image",
  width: 350,
  height: 262,
  maxSize: 1,
  placeholder: "/img/placeholder.svg",
};

export const imageStructureMd = {
  type: "file",
  label: "Image",
  name: "image",
  fileType: "image",
  placeholder: "/img/placeholder.svg",
  width: 728,
  height: 410,
  maxSize: 2,
};

export const imageStructureLg = {
  type: "file",
  label: "Image",
  name: "image",
  fileType: "image",
  placeholder: "/img/placeholder.svg",
  width: 1280,
  height: 720,
  maxSize: 3,
};

export const userInfoSchema = {
  type: "component",
  name: "user",
  filepath: "UserProfileInfo",
  props: {
    avatar: {
      type: "file",
      label: "Avatar",
      name: "user.avatar",
      fileType: "avatar",
      className: "rounded-full",
      width: 64,
      height: 64,
      maxSize: 1,
    },
    firstName: {
      type: "input",
      label: "First Name",
      name: "user.firstName",
      placeholder: "John",
      icon: "ph:user-circle",
    },
    lastName: {
      type: "input",
      label: "Last Name",
      name: "user.lastName",
      placeholder: "Doe",
      icon: "ph:user-circle",
    },
    id: {
      name: "user.id",
    },
  },
};
