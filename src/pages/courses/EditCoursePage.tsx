import { useParams } from "react-router-dom";
import { CourseForm } from "@/components/courses/CourseForm";

export default function EditCoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  
  return <CourseForm mode="edit" courseId={courseId} />;
}
