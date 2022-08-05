import { Subjects } from "./subjects";
export interface Query_CommentCreatedEvent {
  subject: Subjects.Query_CommentCreated,
  data: {
    id: string,
    todoId: string,
    userId: string,
    createdAt: string,
    content: string
  }
}