import bo.edu.uagrm.saludu.scheduling.application.SugeridorAgenda;
import java.time.*;
import java.util.*;
import java.nio.charset.StandardCharsets;

/** Fixture F-04: ejecuta el generador de producción con jornadas sintéticas, sin conectarse a la base. */
public class GenerarSugerenciasF04 {
    static String json(Object x) {
        if (x == null) return "null";
        if (x instanceof String s) return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\"";
        if (x instanceof Number || x instanceof Boolean) return x.toString();
        if (x instanceof Map<?, ?> m) return "{" + m.entrySet().stream().map(e -> json(e.getKey().toString()) + ":" + json(e.getValue())).reduce((a,b) -> a + "," + b).orElse("") + "}";
        if (x instanceof List<?> l) return "[" + l.stream().map(GenerarSugerenciasF04::json).reduce((a,b) -> a + "," + b).orElse("") + "]";
        throw new IllegalArgumentException(x.getClass().toString());
    }
    static String encode(String s) { return Base64.getEncoder().encodeToString(s.getBytes(StandardCharsets.UTF_8)); }
    static void output(SugeridorAgenda.Sugerencia s) {
        System.out.println(String.join("\t", s.tipo(), s.fecha().toString(), s.idPersonal() == null ? "-" : s.idPersonal().toString(),
            s.idEspecialidad() == null ? "-" : s.idEspecialidad().toString(), encode(json(s.valor())), encode(s.explicacion()), s.venceEn().toString()));
    }
    public static void main(String[] args) {
        var date = LocalDate.parse(args[0]);
        var doctor = UUID.fromString(args[1]);
        var area = UUID.fromString(args[2]);
        var start = OffsetDateTime.parse(args[3]);
        var slots = new ArrayList<SugeridorAgenda.Cupo>();
        for (int i = 0; i < 10; i++) slots.add(new SugeridorAgenda.Cupo(UUID.fromString(args[5+i]), start.plusMinutes(30L*i), 1, 0));
        var model = new SugeridorAgenda();
        model.jornada(new SugeridorAgenda.Jornada(date, doctor, null, start, slots, 6, 4, args[4], false)).forEach(GenerarSugerenciasF04::output);
        if (args.length > 15) {
            var end = SugeridorAgenda.ultimoDiaHabil(date, 10);
            model.alerta(new SugeridorAgenda.DemandaEspecialidad(area, 10, 20, 0, 10, 10, 2), date, end).ifPresent(GenerarSugerenciasF04::output);
            model.alerta(new SugeridorAgenda.DemandaEspecialidad(UUID.fromString(args[15]), 0, 20, 20, 4, 10, 0), date, end).ifPresent(GenerarSugerenciasF04::output);
        }
    }
}
