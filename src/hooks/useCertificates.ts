import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Certificate {
  certificate_id: string;
  course_id: string;
  course_title: string;
  certificate_number: string;
  issued_at: string;
  certificate_data: {
    course_title: string;
    course_duration: number;
    user_email: string;
    completion_date: string;
    issued_by: string;
  };
  course_duration: number;
  course_category: string;
}

// Hook para buscar certificados do usuário
export const useUserCertificates = () => {
  return useQuery({
    queryKey: ["user-certificates"],
    queryFn: async () => {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase.rpc("get_user_certificates", {
        p_user_id: user.data.user.id,
      });

      if (error) throw error;
      return data as Certificate[];
    },
  });
};

// Hook para gerar certificado manualmente
export const useGenerateCertificate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ courseId }: { courseId: string }) => {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase.rpc("generate_course_certificate", {
        p_course_id: courseId,
        p_user_id: user.data.user.id,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-certificates"] });
      toast.success("Certificado gerado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao gerar certificado:", error);
      toast.error("Erro ao gerar certificado");
    },
  });
};

// Hook para baixar certificado como PDF
export const useDownloadCertificate = () => {
  return useMutation({
    mutationFn: async (certificate: Certificate) => {
      // Aqui você implementaria a geração do PDF
      // Por enquanto, vamos simular o download
      const element = document.createElement("a");
      const certificateContent = generateCertificateHTML(certificate);
      
      // Converter para blob (em uma implementação real, você usaria uma biblioteca como jsPDF)
      const blob = new Blob([certificateContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      
      element.href = url;
      element.download = `certificado-${certificate.certificate_number}.html`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast.success("Certificado baixado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao baixar certificado:", error);
      toast.error("Erro ao baixar certificado");
    },
  });
};

// Função auxiliar para gerar HTML do certificado
function generateCertificateHTML(certificate: Certificate): string {
  const data = certificate.certificate_data;
  
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Certificado - ${data.course_title}</title>
      <style>
        body {
          font-family: 'Georgia', serif;
          margin: 0;
          padding: 40px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .certificate {
          background: white;
          padding: 60px;
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          max-width: 800px;
          width: 100%;
          text-align: center;
          border: 8px solid #f8f9fa;
          position: relative;
        }
        .certificate::before {
          content: '';
          position: absolute;
          top: 20px;
          left: 20px;
          right: 20px;
          bottom: 20px;
          border: 3px solid #667eea;
          border-radius: 10px;
          pointer-events: none;
        }
        .header {
          margin-bottom: 40px;
        }
        .logo {
          width: 80px;
          height: 80px;
          background: #667eea;
          border-radius: 50%;
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 24px;
          font-weight: bold;
        }
        .title {
          font-size: 36px;
          color: #2d3748;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 3px;
        }
        .subtitle {
          font-size: 18px;
          color: #667eea;
          margin-bottom: 40px;
        }
        .content {
          margin: 40px 0;
          line-height: 1.8;
        }
        .recipient {
          font-size: 20px;
          color: #4a5568;
          margin-bottom: 20px;
        }
        .course-name {
          font-size: 28px;
          color: #2d3748;
          font-weight: bold;
          margin: 20px 0;
          text-decoration: underline;
          text-decoration-color: #667eea;
        }
        .details {
          font-size: 16px;
          color: #4a5568;
          margin: 30px 0;
        }
        .footer {
          margin-top: 50px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .signature {
          text-align: center;
        }
        .signature-line {
          width: 200px;
          border-top: 2px solid #2d3748;
          margin-bottom: 10px;
        }
        .certificate-number {
          font-size: 12px;
          color: #a0aec0;
          margin-top: 20px;
        }
        .seal {
          width: 100px;
          height: 100px;
          background: #667eea;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 12px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="certificate">
        <div class="header">
          <div class="logo">MP</div>
          <h1 class="title">Certificado</h1>
          <p class="subtitle">de Conclusão de Curso</p>
        </div>
        
        <div class="content">
          <p class="recipient">
            Certificamos que
          </p>
          
          <h2 style="font-size: 24px; color: #2d3748; margin: 20px 0;">
            ${data.user_email}
          </h2>
          
          <p style="font-size: 18px; color: #4a5568;">
            concluiu com êxito o curso
          </p>
          
          <div class="course-name">${data.course_title}</div>
          
          <div class="details">
            <p>Duração: ${data.course_duration} horas</p>
            <p>Data de Conclusão: ${new Date(data.completion_date).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
        
        <div class="footer">
          <div class="signature">
            <div class="signature-line"></div>
            <p style="margin: 0; font-size: 14px;">${data.issued_by}</p>
            <p style="margin: 0; font-size: 12px; color: #a0aec0;">Instituição Certificadora</p>
          </div>
          
          <div class="seal">
            <div>
              SELO<br>
              OFICIAL
            </div>
          </div>
        </div>
        
        <div class="certificate-number">
          Certificado Nº: ${certificate.certificate_number}
        </div>
      </div>
    </body>
    </html>
  `;
}
