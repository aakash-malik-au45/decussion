import React, { useEffect, useState } from "react";
import { apiFetch, api } from "../api";

import "./Post.css"; // adjust path if needed

/* ---------------------------------------------------
   Type Definitions (Support BOTH old nodes & new comments)
----------------------------------------------------- */

type NodeItem = {
  _id: string;
  parentId: string | null;
  op: "add" | "sub" | "mul" | "div" | null;
  rightOperand: number | null;
  result: number;
  authorId: string;
  authorName?: string;
  createdAt: string;
};

// base comment shape (no children)
type CommentItem = {
  _id: string;
  parentId: string | null;
  text: string;
  authorId: string;
  authorName?: string;
  createdAt: string;
};

// recursive node type (comment + children)
type CommentNode = CommentItem & {
  children: CommentNode[];
};

type Post = {
  _id: string;
  authorId: string;
  authorName?: string;
  text?: string;
  comments?: CommentItem[];
  startNumber?: number;
  nodes?: NodeItem[];
  createdAt: string;
};

/* ---------------------------------------------------
   Helper: decode token payload safely
----------------------------------------------------- */
function getTokenPayload(): { id?: string; username?: string } | null {
  const t = localStorage.getItem("token");
  if (!t) return null;
  try {
    const payload = JSON.parse(atob(t.split(".")[1]));
    return { id: payload.id, username: payload.username };
  } catch {
    return null;
  }
}

/* ---------------------------------------------------
   Helper converts: nodes[] → comments[]
----------------------------------------------------- */

function normalizeComments(post: Post): CommentItem[] {
  // NEW MODEL: direct comments
  if (Array.isArray(post.comments)) return post.comments;

  // LEGACY MODEL: convert numeric nodes to comments
  if (Array.isArray(post.nodes)) {
    return post.nodes.map((n) => {
      const text = n.op ? `${n.op} ${n.rightOperand} → ${n.result}` : `Start: ${n.result}`;
      return {
        _id: String(n._id),
        parentId: n.parentId ? String(n.parentId) : null,
        text,
        authorId: n.authorId,
        authorName: (n as any).authorName,
        createdAt: n.createdAt,
      };
    });
  }

  return [];
}

/* ---------------------------------------------------
   MAIN PAGE COMPONENT
----------------------------------------------------- */

export default function PostsPage(): React.JSX.Element {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [newPostText, setNewPostText] = useState("");

  useEffect(() => {
    // restore global axios header if token exists (helps across reloads)
    const tok = localStorage.getItem("token");
    if (tok) api.defaults.headers.common["Authorization"] = `Bearer ${tok}`;

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch("/posts", { method: "get" });
      // apiFetch returns axios response (res.data)
      setPosts(res.data);
      console.log("Loaded posts:", res.data);
    } catch (err: any) {
      console.error("Failed to load:", err);
      alert("Failed to load posts");
    } finally {
      setLoading(false);
    }
  }

  async function createPost() {
    if (!newPostText.trim()) return alert("Enter text");
    try {
      // use axios wrapper to ensure header is sent
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await api.post("/posts", { text: newPostText.trim() }, { headers });
      setNewPostText("");
      await load();
    } catch (err: any) {
      console.error(err);
      alert("Create failed: " + (err.response?.data?.error || err.message));
    }
  }

  return (
    <div className="posts-page">
      <header className="posts-header">
        <h1>Discussions</h1>
        <div className="create-row">
          <input
            value={newPostText}
            onChange={(e) => setNewPostText(e.target.value)}
            placeholder="What's on your mind?"
          />
          <button className="btn primary" onClick={createPost}>
            Post
          </button>
        </div>
      </header>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="posts-list">
          {posts.map((p) => (
            <PostCard key={p._id} post={p} refresh={load} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------
   POST CARD
   - always shows top-level reply composer
----------------------------------------------------- */

function PostCard({ post, refresh }: { post: Post; refresh: () => void }) {
  const isNumeric = Array.isArray(post.nodes) || typeof post.startNumber === "number";

  const list = normalizeComments(post);

  // Build comment tree using CommentNode
  const map = new Map<string, CommentNode>();
  list.forEach((c) =>
    map.set(c._id, {
      ...c,
      children: [],
    } as CommentNode)
  );

  const roots: CommentNode[] = [];
  map.forEach((node) => {
    if (!node.parentId) roots.push(node);
    else {
      const parent = map.get(node.parentId);
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
  });

  // Top-level composer state (for adding a root comment to this post)
  const [showTopComposer, setShowTopComposer] = useState(false);
  const [topText, setTopText] = useState("");
  const [topLoading, setTopLoading] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);

  async function submitTopComment() {
    setTopError(null);
    const token = localStorage.getItem("token");
    if (!token) {
      setTopError("Login required to comment.");
      return;
    }
    const trimmed = topText.trim();
    if (!trimmed) {
      setTopError("Comment cannot be empty.");
      return;
    }
    setTopLoading(true);

    // optional: optimistic top-level comment handling is omitted for simplicity
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await api.post(`/posts/${post._id}/comments`, { parentId: null, text: trimmed }, { headers });

      setTopText("");
      setShowTopComposer(false);
      await refresh(); // reload canonical data (updates comments)
    } catch (err: any) {
      console.error("Top comment failed:", err);
      setTopError(err?.response?.data?.error || err?.message || "Failed to post comment");
    } finally {
      setTopLoading(false);
    }
  }

  return (
    <div className="post-card">
      {post.text ? (
        <div className="post-text">{post.text}</div>
      ) : (
        <div className="post-text">
          <strong>Start:</strong> {post.startNumber ?? post.nodes?.[0]?.result}
        </div>
      )}

      <div className="post-meta">
        by {post.authorName ?? post.authorId} · {new Date(post.createdAt).toLocaleString()}
      </div>

      {/* Always show a top-level "Reply / Add comment" action */}
      <div style={{ marginTop: 12, marginBottom: 8 }}>
        <button
          className="btn"
          onClick={() => {
            setShowTopComposer((s) => !s);
            setTopError(null);
          }}
        >
          {showTopComposer ? "Cancel" : "Reply"}
        </button>
      </div>

      {showTopComposer && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={topText}
              onChange={(e) => setTopText(e.target.value)}
              placeholder="Write a comment..."
              disabled={topLoading}
              style={{ flex: 1 }}
            />
            <button className="btn" onClick={submitTopComment} disabled={topLoading}>
              {topLoading ? "Sending..." : "Send"}
            </button>
          </div>
          {topError && <div style={{ color: "#dc2626", marginTop: 6 }}>{topError}</div>}
        </div>
      )}

      <div className="comments">
        {/* Render existing root comments (if any). If none, this will be empty but the top composer still shows. */}
        {roots.map((r) => (
          <CommentBlock
            key={r._id}
            node={r}
            postId={post._id}
            refresh={refresh}
            depth={0}
            numericFallback={isNumeric}
            nodes={post.nodes}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------
   COMMENT BLOCK
   - optimistic replies with authorName from token
----------------------------------------------------- */

function CommentBlock({
  node,
  postId,
  refresh,
  depth,
  numericFallback,
  nodes,
}: {
  node: CommentNode;
  postId: string;
  refresh: () => void;
  depth: number;
  numericFallback?: boolean;
  nodes?: NodeItem[];
}) {
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState("");
  const [loadingReply, setLoadingReply] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // local children state for optimistic updates:
  const [childrenState, setChildrenState] = useState<CommentNode[]>(() => node.children ?? []);

  useEffect(() => {
    // keep local children updated if node.children changes externally (e.g. refresh)
    setChildrenState(node.children ?? []);
  }, [node.children]);

  async function submitReply() {
    setErrorMsg(null);
    const token = localStorage.getItem("token");
    if (!token) {
      setErrorMsg("You must be logged in to reply.");
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) {
      setErrorMsg("Reply cannot be empty.");
      return;
    }

    // optimistic temp with username from token
    const payload = getTokenPayload();
    const tempId = `temp_${Math.random().toString(36).slice(2, 9)}`;
    const tempComment: CommentNode = {
      _id: tempId,
      parentId: node._id,
      text: trimmed,
      authorId: payload?.id ?? "you",
      authorName: payload?.username ?? "You",
      createdAt: new Date().toISOString(),
      children: [],
    };

    // push optimistically
    setChildrenState((prev) => [...prev, tempComment]);
    setText("");
    setReplying(false);
    setLoadingReply(true);

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await api.post(`/posts/${postId}/comments`, { parentId: node._id, text: trimmed }, { headers });

      // success: fetch fresh data to replace temp state with canonical server data
      await refresh();
    } catch (err: any) {
      console.error("Reply failed:", err);
      const msg = err?.response?.data?.error || err?.message || "Failed to post reply";
      setErrorMsg(String(msg));

      // rollback optimistic reply: remove temp by id
      setChildrenState((prev) => prev.filter((c) => c._id !== tempId));
    } finally {
      setLoadingReply(false);
    }
  }

  // numeric fallback rendering (unchanged)
  let numericText: string | null = null;
  if (numericFallback && nodes) {
    const n = nodes.find((x) => String(x._id) === String(node._id));
    if (n) {
      numericText = n.op ? `${n.op} ${n.rightOperand} → ${n.result}` : `Start: ${n.result}`;
    }
  }

  return (
    <div className="comment-block" style={{ marginLeft: depth * 18 }}>
      <div className="comment-main">
        <div className="comment-meta">
          <strong>{node.authorName ?? node.authorId}</strong> ·{" "}
          <span className="muted">{new Date(node.createdAt).toLocaleString()}</span>
        </div>

        <div className="comment-text">{node.text || numericText}</div>

        <div className="comment-actions">
          <button
            className="link-btn"
            onClick={() => {
              setReplying((s) => !s);
              setErrorMsg(null);
            }}
          >
            {replying ? "Cancel" : "Reply"}
          </button>
        </div>
      </div>

      {replying && (
        <div className="reply-form">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a reply..." disabled={loadingReply} />
          <button className="btn" onClick={submitReply} disabled={loadingReply}>
            {loadingReply ? "Sending..." : "Send"}
          </button>
        </div>
      )}

      {errorMsg && <div style={{ color: "#dc2626", marginTop: 6 }}>{errorMsg}</div>}

      {/* render children from local state (optimistic + canonical after refresh) */}
      {childrenState.map((child) => (
        <CommentBlock key={child._id} node={child} postId={postId} refresh={refresh} depth={depth + 1} numericFallback={numericFallback} nodes={nodes} />
      ))}
    </div>
  );
}
