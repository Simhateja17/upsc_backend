import prisma from "../src/config/database";
import { Prisma } from "@prisma/client";
import { mapEditorialToSyllabus, mappingDisplayTags } from "../src/services/editorialSyllabusMapper";

async function main() {
  const editorials = await prisma.editorial.findMany({
    where: { syllabusMappingOverridden: false, primarySyllabusPath: { equals: Prisma.DbNull } },
    orderBy: { publishedAt: "desc" },
  });
  let mapped = 0;
  for (const editorial of editorials) {
    const mapping = await mapEditorialToSyllabus(editorial.title, editorial.summary, editorial.content);
    if (!mapping.primary) continue;
    await prisma.editorial.update({
      where: { id: editorial.id },
      data: {
        category: mapping.primary.subject,
        tags: mappingDisplayTags(mapping),
        primarySyllabusPath: mapping.primary,
        secondarySyllabusPaths: mapping.secondary,
        syllabusMappingSource: mapping.source,
      },
    });
    mapped++;
  }
  console.log(`Mapped ${mapped} of ${editorials.length} legacy editorials.`);
}

main().finally(() => prisma.$disconnect());
