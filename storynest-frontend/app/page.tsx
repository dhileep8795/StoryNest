"use client";

import "@cloudscape-design/global-styles/index.css";

import {
  AppLayout,
  Badge,
  Box,
  Button,
  Cards,
  Container,
  ContentLayout,
  Flashbar,
  FormField,
  Header,
  Input,
  Modal,
  Popover,
  SpaceBetween,
  StatusIndicator,
  Textarea,
} from "@cloudscape-design/components";
import { useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

type User = {
  id: number;
  username: string;
  is_following: boolean;
};

type Post = {
  id: number;
  body: string;
  author_id: number;
  author_username: string;
  like_count: number;
  comment_count: number;
};

type Comment = {
  id: number;
  body: string;
  user_id: number;
  username: string;
  post_id: number;
  created_at: string;
};

type Notification = {
  id: number;
  kind: "like" | "comment";
  read: boolean;
  actor_id: number;
  actor_username: string;
  post_id: number;
  created_at: string;
};

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  const [token, setToken] = useState("");
  const [body, setBody] = useState("");

  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [followingIds, setFollowingIds] = useState<number[]>([]);

  const [message, setMessage] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [registerError, setRegisterError] = useState("");

  const [activePost, setActivePost] = useState<Post | null>(null);

  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentText, setCommentText] = useState("");

  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);

  const [showLikesModal, setShowLikesModal] = useState(false);
  const [likedUsers, setLikedUsers] = useState<User[]>([]);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileUser, setProfileUser] = useState<User | null>(null);

  const [showProfile, setShowProfile] = useState(false);
  const [myPosts, setMyPosts] = useState<Post[]>([]);

  const authHeaders = (accessToken = token) => ({
    Authorization: `Bearer ${accessToken}`,
  });

  const loadFeed = async (accessToken = token) => {
    try {
      const response = await fetch(`${API}/feed`, {
        headers: authHeaders(accessToken),
      });

      if (!response.ok) {
        throw new Error("Unable to load feed");
      }

      setPosts(await response.json());
    } catch {
      setMessage("Unable to load feed. Check whether FastAPI is running.");
    }
  };

  const loadMyPosts = async () => {
  try {
    const response = await fetch(`${API}/my-posts`, {
      headers: authHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.detail || "Unable to load your posts.");
      return;
    }

    setMyPosts(data);
    setShowProfile(true);
  } catch {
    setMessage("Cannot connect to backend.");
  }
};

  const loadUsers = async (accessToken = token) => {
    try {
      const response = await fetch(`${API}/users`, {
        headers: authHeaders(accessToken),
      });

      if (!response.ok) {
        throw new Error("Unable to load users");
      }

      setUsers(await response.json());
    } catch {
      setMessage("Unable to load registered users.");
    }
  };

  const loadNotifications = async (accessToken = token) => {
    try {
      const response = await fetch(`${API}/notifications`, {
        headers: authHeaders(accessToken),
      });

      if (!response.ok) {
        throw new Error("Unable to load notifications");
      }

      setNotifications(await response.json());
    } catch {
      setMessage("Unable to load notifications.");
    }
  };

  const login = async () => {
    try {
      const response = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          username: email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.detail || "Login failed.");
        return;
      }

      setToken(data.access_token);
      setMessage("Signed in successfully.");

      await Promise.all([
        loadFeed(data.access_token),
        loadUsers(data.access_token),
        loadNotifications(data.access_token),
      ]);
    } catch {
      setMessage(
        "Cannot connect to backend. Start FastAPI and enable CORS for port 5173."
      );
    }
  };

  const register = async () => {
    setRegisterError("");

    try {
      const response = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setRegisterError(
          data.detail || "Unable to create account. Please try again."
        );
        return;
      }

      setShowRegister(false);
      setMessage("Account created successfully. Please log in.");

      setUsername("");
      setEmail("");
      setPassword("");
    } catch {
      setRegisterError(
        "Cannot connect to backend. Ensure FastAPI is running on port 8000."
      );
    }
  };

  const followUser = async (userId: number) => {
  try {
    const response = await fetch(`${API}/users/${userId}/follow`, {
      method: "POST",
      headers: authHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.detail || "Unable to follow this user.");
      return;
    }

    setMessage("User followed successfully.");

    await Promise.all([
      loadUsers(),
      loadFeed(),
    ]);
  } catch {
    setMessage("Cannot connect to backend.");
  }
};

  const likePost = async (postId: number) => {
    try {
      const response = await fetch(`${API}/posts/${postId}/like`, {
        method: "POST",
        headers: authHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.detail || "Unable to like this post.");
        return;
      }

      setMessage("Post liked.");
      await loadFeed();
    } catch {
      setMessage("Cannot connect to backend.");
    }
  };

  const openProfile = async (userId: number) => {
  try {
    const response = await fetch(`${API}/users/${userId}`, {
      headers: authHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.detail || "Unable to load user profile.");
      return;
    }

    setProfileUser(data);
    setShowProfileModal(true);
  } catch {
    setMessage("Cannot connect to backend.");
  }
};

  const openLikedUsers = async (post: Post) => {
    try {
      const response = await fetch(`${API}/posts/${post.id}/likes`, {
        headers: authHeaders(),
      });

      if (!response.ok) {
        setMessage("Unable to load users who liked this post.");
        return;
      }

      setActivePost(post);
      setLikedUsers(await response.json());
      setShowLikesModal(true);
    } catch {
      setMessage("Cannot connect to backend.");
    }
  };

  const openComments = async (post: Post) => {
    try {
      const response = await fetch(`${API}/posts/${post.id}/comments`, {
        headers: authHeaders(),
      });

      if (!response.ok) {
        setMessage("Unable to load comments.");
        return;
      }

      setActivePost(post);
      setComments(await response.json());
      setShowCommentsModal(true);
    } catch {
      setMessage("Cannot connect to backend.");
    }
  };

  const openAddComment = (post: Post) => {
    setActivePost(post);
    setCommentText("");
    setShowCommentModal(true);
  };

  const addComment = async () => {
    if (!activePost || !commentText.trim()) {
      return;
    }

    try {
      const response = await fetch(
        `${API}/posts/${activePost.id}/comments`,
        {
          method: "POST",
          headers: {
            ...authHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            body: commentText,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.detail || "Unable to add comment.");
        return;
      }

      setShowCommentModal(false);
      setCommentText("");
      setMessage("Comment added.");

      await loadFeed();
    } catch {
      setMessage("Cannot connect to backend.");
    }
  };

  const publish = async () => {
    try {
      const response = await fetch(`${API}/posts`, {
        method: "POST",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.detail || "Unable to publish post.");
        return;
      }

      setBody("");
      setMessage("Post published.");
      await loadFeed();
    } catch {
      setMessage("Cannot connect to backend.");
    }
  };

  const logout = () => {
    setToken("");
    setPosts([]);
    setUsers([]);
    setNotifications([]);
    setFollowingIds([]);
    setEmail("");
    setPassword("");
    setBody("");
    setMessage("Logged out successfully.");
  };

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  return (
    <>
      <AppLayout
        navigationHide={!token}
        toolsHide={!token}
        navigationWidth={300}
        toolsWidth={320}
        navigation={
          <Container header={<Header variant="h2">Discover writers</Header>}>
            <Cards
              items={users}
              cardsPerRow={[{ cards: 1 }]}
              cardDefinition={{
                header: (user) => (
                  <Header variant="h3">@{user.username}</Header>
                ),
                sections: [
                  {
                    id: "follow",
                    content: (user) => (
                    <Button
                      variant={user.is_following ? "normal" : "primary"}
                      disabled={user.is_following}
                      onClick={() => followUser(user.id)}
                    >
                      {user.is_following ? "Following" : "Follow"}
                    </Button>
                  ),
                  },
                ],
              }}
              empty="No other writers have registered yet."
            />
          </Container>
        }
        tools={
          <Container
            header={
              <Header
                variant="h2"
                counter={unreadCount ? `(${unreadCount})` : undefined}
                actions={
                  <Button onClick={() => loadNotifications()}>
                    Refresh
                  </Button>
                }
              >
                Notifications
              </Header>
            }
          >
            <SpaceBetween size="s">
              {notifications.length === 0 ? (
                <Box color="text-body-secondary">
                  No notifications yet.
                </Box>
              ) : (
                notifications.map((notification) => (
                  <Box key={notification.id}>
                    <SpaceBetween direction="horizontal" size="xs">
                      {!notification.read && <Badge color="blue">New</Badge>}

                      <Box>
                        <Button
                          variant="inline-link"
                          onClick={() => openProfile(notification.actor_id)}
                        >
                          @{notification.actor_username}
                        </Button>{" "}
                        {notification.kind === "like"
                          ? "liked your post"
                          : "commented on your post"}
                      </Box>
                    </SpaceBetween>
                  </Box>
                ))
              )}
            </SpaceBetween>
          </Container>
        }
        content={
          <ContentLayout
            header={
              <Header
                variant="h1"
                actions={
                  token ? (
                    <SpaceBetween direction="horizontal" size="xs">
                      <Button onClick={() => loadFeed()}>
                        My Feed
                      </Button>
                      <Button onClick={loadMyPosts}>
                        Profile
                      </Button>
                      <Button onClick={logout}>
                        Logout
                      </Button>
                    </SpaceBetween>
                  ) : undefined
                }
              >
                InkNest <small>Writing, shared.</small>
              </Header>
            }
          >
            <SpaceBetween size="l">
              {message && (
                <Flashbar
                  items={[
                    {
                      type: "info",
                      content: message,
                      dismissible: true,
                      onDismiss: () => setMessage(""),
                    },
                  ]}
                />
              )}

              {!token ? (
                <Container header={<Header variant="h2">Sign in</Header>}>
                  <SpaceBetween size="m">
                    <FormField label="Email">
                      <Input
                        value={email}
                        onChange={(event) => setEmail(event.detail.value)}
                      />
                    </FormField>

                    <FormField label="Password">
                      <Input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.detail.value)}
                      />
                    </FormField>

                    <Button variant="primary" onClick={login}>
                      Login
                    </Button>

                    <Button
                      variant="link"
                      onClick={() => {
                        setRegisterError("");
                        setShowRegister(true);
                      }}
                    >
                      Create a new account
                    </Button>
                  </SpaceBetween>
                </Container>
              ) : (
                <>
                  <Container
                    header={<Header variant="h2">Share a thought</Header>}
                  >
                    <SpaceBetween size="s">
                      <Textarea
                        value={body}
                        onChange={(event) => setBody(event.detail.value)}
                        placeholder="What are you writing today?"
                      />

                      <Button
                        variant="primary"
                        disabled={!body.trim()}
                        onClick={publish}
                      >
                        Publish
                      </Button>
                    </SpaceBetween>
                  </Container>

                  <Cards
                    header={
                      <Header
                        variant="h2"
                        actions={
                          <Button onClick={() => loadFeed()}>
                            Refresh feed
                          </Button>
                        }
                      >
                        My Feed
                      </Header>
                    }
                    items={posts}
                    cardsPerRow={[
                      { cards: 1 },
                      { minWidth: 460, cards: 2 },
                      { minWidth: 850, cards: 3 },
                    ]}
                    cardDefinition={{
                      header: (post) => (
                        <Header variant="h3">
                          @{post.author_username}
                        </Header>
                      ),
                      sections: [
                        {
                          id: "body",
                          content: (post) => (
                            <Box variant="p">{post.body}</Box>
                          ),
                        },
                        {
                          id: "actions",
                          content: (post) => (
                            <SpaceBetween direction="horizontal" size="xs">
                              <Popover
                                dismissButton={false}
                                position="top"
                                size="medium"
                                triggerType="custom"
                                content={
                                  <Button
                                    variant="link"
                                    onClick={() => openLikedUsers(post)}
                                  >
                                    See users who liked this post
                                  </Button>
                                }
                              >
                                <Button onClick={() => likePost(post.id)}>
                                  Like ({post.like_count})
                                </Button>
                              </Popover>

                              <Button onClick={() => openComments(post)}>
                                Comments ({post.comment_count})
                              </Button>

                              <Button onClick={() => openAddComment(post)}>
                                Add comment
                              </Button>
                            </SpaceBetween>
                          ),
                        },
                      ],
                    }}
                    empty="Follow writers from the left panel to see their posts here."
                  />
                </>
              )}
            </SpaceBetween>
          </ContentLayout>
        }
      />

      <Modal
        visible={showRegister}
        onDismiss={() => {
          setShowRegister(false);
          setRegisterError("");
        }}
        header="Create your InkNest account"
        footer={
          <SpaceBetween direction="horizontal" size="xs">
            <Button
              onClick={() => {
                setShowRegister(false);
                setRegisterError("");
              }}
            >
              Cancel
            </Button>

            <Button variant="primary" onClick={register}>
              Register
            </Button>
          </SpaceBetween>
        }
      >
        <SpaceBetween size="m">
          {registerError && (
            <Flashbar
              items={[
                {
                  type: "error",
                  content: registerError,
                  dismissible: true,
                  onDismiss: () => setRegisterError(""),
                },
              ]}
            />
          )}

          <FormField label="Username">
            <Input
              value={username}
              onChange={(event) => setUsername(event.detail.value)}
            />
          </FormField>

          <FormField label="Email">
            <Input
              value={email}
              onChange={(event) => setEmail(event.detail.value)}
            />
          </FormField>

          <FormField label="Password">
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.detail.value)}
            />
          </FormField>
        </SpaceBetween>
      </Modal>

      <Modal
        visible={showCommentModal}
        onDismiss={() => {
          setShowCommentModal(false);
          setCommentText("");
        }}
        header={
          activePost
            ? `Comment on @${activePost.author_username}'s post`
            : "Add a comment"
        }
        footer={
          <SpaceBetween direction="horizontal" size="xs">
            <Button onClick={() => setShowCommentModal(false)}>
              Cancel
            </Button>

            <Button
              variant="primary"
              disabled={!commentText.trim()}
              onClick={addComment}
            >
              Comment
            </Button>
          </SpaceBetween>
        }
      >
        <FormField label="Your comment">
          <Textarea
            value={commentText}
            onChange={(event) => setCommentText(event.detail.value)}
            placeholder="Write a thoughtful response..."
          />
        </FormField>
      </Modal>

      <Modal
        visible={showCommentsModal}
        onDismiss={() => {
          setShowCommentsModal(false);
          setComments([]);
        }}
        header={
          activePost
            ? `Comments on @${activePost.author_username}'s post`
            : "Comments"
        }
      >
        <SpaceBetween size="m">
          {comments.length === 0 ? (
            <StatusIndicator type="info">No comments yet.</StatusIndicator>
          ) : (
            comments.map((comment) => (
              <Container key={comment.id}>
                <SpaceBetween size="xs">
                <Button
                  variant="inline-link"
                  onClick={() => openProfile(comment.user_id)}
                >
                  @{comment.username}
                </Button>

                <Box variant="p">{comment.body}</Box>
              </SpaceBetween>
              </Container>
            ))
          )}
        </SpaceBetween>
      </Modal>

      <Modal
        visible={showLikesModal}
        onDismiss={() => {
          setShowLikesModal(false);
          setLikedUsers([]);
        }}
        header={
          activePost
            ? `Liked by — @${activePost.author_username}'s post`
            : "Liked users"
        }
      >
        <SpaceBetween size="s">
          {likedUsers.length === 0 ? (
            <StatusIndicator type="info">No likes yet.</StatusIndicator>
          ) : (
            likedUsers.map((user) => (
              <Container key={user.id}>
                <Button
                  variant="inline-link"
                  onClick={() => openProfile(user.id)}
                >
                  @{user.username}
                </Button>
              </Container>
            ))
          )}
        </SpaceBetween>
      </Modal>
      <Modal
  visible={showProfileModal}
  onDismiss={() => setShowProfileModal(false)}
  header={profileUser ? `@${profileUser.username}` : "User profile"}
  footer={
    <Button onClick={() => setShowProfileModal(false)}>
      Close
    </Button>
  }
>
  {profileUser && (
    <SpaceBetween size="m">
      <Box>
        Username: <b>@{profileUser.username}</b>
      </Box>

      <Button
        variant="primary"
        disabled={profileUser.is_following}
        onClick={() => followUser(profileUser.id)}
      >
        {profileUser.is_following ? "Following" : "Follow"}
      </Button>
    </SpaceBetween>
  )}
</Modal>
<Modal
  visible={showProfile}
  onDismiss={() => setShowProfile(false)}
  header="My Profile"
  footer={
    <Button onClick={() => setShowProfile(false)}>
      Close
    </Button>
  }
>
  <SpaceBetween size="m">
    <Header variant="h2">My posts ({myPosts.length})</Header>

    {myPosts.length === 0 ? (
      <Box color="text-body-secondary">
        You have not created any posts yet.
      </Box>
    ) : (
      myPosts.map((post) => (
        <Container key={post.id}>
          <SpaceBetween size="xs">
            <Box variant="p">{post.body}</Box>

            <Box color="text-body-secondary">
              {post.like_count} likes · {post.comment_count} comments
            </Box>
          </SpaceBetween>
        </Container>
      ))
    )}
  </SpaceBetween>
</Modal>
    </>
  );
}