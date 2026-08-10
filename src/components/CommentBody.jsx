import { Link } from "react-router-dom";
import { findUserByMention, splitCommentWithMentions } from "../lib/mentions.js";

export default function CommentBody({ text, users, onMentionClick }) {
  const parts = splitCommentWithMentions(text);

  return (
    <p className="for-you-comments-item-text">
      {parts.map((part, i) => {
        if (part.type === "text") {
          return <span key={i}>{part.value}</span>;
        }

        const user = findUserByMention(users, part.token);
        if (!user) {
          return (
            <span key={i} className="comment-mention comment-mention-unknown">
              {part.value}
            </span>
          );
        }

        return (
          <Link
            key={i}
            to={`/user/${user.id}`}
            className="comment-mention"
            onClick={(e) => {
              e.stopPropagation();
              onMentionClick?.();
            }}
          >
            {part.value}
          </Link>
        );
      })}
    </p>
  );
}
